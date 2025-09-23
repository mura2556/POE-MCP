import http from 'node:http';
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { searchData, getSchema, itemParse, pobDecode, pobEncode, craftingLookup, economySnapshot, historyDiff, verifyCoverageTool } from './tools.js';
import type { SchemaKinds } from '../schema/zod.js';
import { createRequestContext, logWarn, logInfo } from '../utils/logger.js';
import { mcpRequestsTotal, mcpRequestDurationSeconds, registry } from '../utils/metrics.js';

const METHODS: Record<string, (...args: any[]) => Promise<unknown>> = {
  search_data: async (params: { kind: SchemaKinds; q: string }) => searchData(params.kind, params.q),
  get_schema: async (params: { kind: SchemaKinds }) => getSchema(params.kind),
  item_parse: async (params: { text: string }) => itemParse(params.text),
  pob_decode: async (params: { code: string }) => pobDecode(params.code),
  pob_encode: async (params: { xml: string }) => pobEncode(params.xml),
  crafting_lookup: async (params: { base_id: string; desired_mods: string[] }) => craftingLookup(params.base_id, params.desired_mods),
  economy_snapshot: async (params: { kind: string; key: string }) => economySnapshot(params.kind, params.key),
  history_diff: async (params: { kind: SchemaKinds; id: string }) => historyDiff(params.kind, params.id),
  verify_coverage: async () => verifyCoverageTool(),
};

interface RpcRequest {
  id: string | number;
  method: string;
  params: any;
  streamId?: string;
}

interface RpcResponse {
  id: string | number;
  result?: unknown;
  error?: { message: string };
}

async function handleRequest(payload: RpcRequest, provenance: string): Promise<RpcResponse> {
  const method = METHODS[payload.method as keyof typeof METHODS];
  if (!method) {
    return { id: payload.id, error: { message: `Unknown method ${payload.method}` } };
  }
  try {
    const result = await method(payload.params);
    return { id: payload.id, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn('MCP handler error', { scope: 'mcp:handler', provenance, method: payload.method, message });
    return { id: payload.id, error: { message } };
  }
}

export async function startStdIOServer(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  rl.on('line', async (line) => {
    try {
      const payload = JSON.parse(line) as RpcRequest;
      const ctx = createRequestContext('mcp:stdio', { provenance: 'stdio' });
      const end = mcpRequestDurationSeconds.startTimer({ method: payload.method });
      const response = await handleRequest(payload, 'stdio');
      const status = response.error ? 'error' : 'success';
      mcpRequestsTotal.inc({ method: payload.method, status });
      end();
      ctx.info('Handled stdio request', { method: payload.method, status });
      process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      process.stdout.write(`${JSON.stringify({ id: null, error: { message: 'invalid json' } })}\n`);
    }
  });
  rl.on('close', () => process.exit(0));
}

interface HttpServerOptions {
  port: number;
  enableMetrics?: boolean;
  enableHealth?: boolean;
}

const sseClients = new Map<string, { res: http.ServerResponse; keepAlive: NodeJS.Timeout }>();

function writeSse(res: http.ServerResponse, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function sendToStream(streamId: string, payload: RpcResponse): void {
  const client = sseClients.get(streamId);
  if (!client) {
    return;
  }
  writeSse(client.res, 'rpc', payload);
}

export async function startHttpServer(portOrOptions: number | HttpServerOptions): Promise<http.Server> {
  const options: HttpServerOptions =
    typeof portOrOptions === 'number'
      ? { port: portOrOptions, enableMetrics: false, enableHealth: false }
      : portOrOptions;
  const server = http.createServer(async (req, res) => {
    const ctx = createRequestContext('mcp:http', { provenance: req.url ?? '/rpc' });
    if (req.url === '/health' && options.enableHealth) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
      return;
    }
    if (req.url === '/metrics' && options.enableMetrics) {
      const body = await registry.metrics();
      res.writeHead(200, { 'Content-Type': registry.contentType });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && req.url?.startsWith('/sse')) {
      const url = new URL(req.url, 'http://localhost');
      const streamId = url.searchParams.get('stream') ?? randomUUID();
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      });
      const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
      }, 15000);
      sseClients.set(streamId, { res, keepAlive });
      writeSse(res, 'ready', { streamId });
      ctx.info('SSE client connected', { streamId });
      req.on('close', () => {
        clearInterval(keepAlive);
        sseClients.delete(streamId);
        ctx.info('SSE client disconnected', { streamId });
      });
      return;
    }
    if (req.method !== 'POST' || req.url !== '/rpc') {
      res.writeHead(404);
      res.end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    try {
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as RpcRequest;
      const end = mcpRequestDurationSeconds.startTimer({ method: payload.method });
      const response = await handleRequest(payload, 'http');
      const status = response.error ? 'error' : 'success';
      mcpRequestsTotal.inc({ method: payload.method, status });
      end();
      ctx.info('Handled HTTP request', { method: payload.method, status, streamId: payload.streamId });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
      if (payload.streamId) {
        sendToStream(payload.streamId, response);
      }
    } catch (error) {
      ctx.error('Failed to parse HTTP request', { error: error instanceof Error ? error.message : String(error) });
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: null, error: { message: 'invalid json' } }));
    }
  });
  await new Promise<void>((resolve) => {
    server.listen(options.port, resolve);
  });
  logInfo('HTTP MCP server listening', { scope: 'mcp:http', port: options.port });
  return server;
}

export async function stopHttpServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
