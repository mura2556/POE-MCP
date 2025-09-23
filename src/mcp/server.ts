import http from 'node:http';
import readline from 'node:readline';
import { searchData, getSchema, itemParse, pobDecode, pobEncode, craftingLookup, economySnapshot, historyDiff, verifyCoverageTool } from './tools.js';
import type { SchemaKinds } from '../schema/zod.js';

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
  method: keyof typeof METHODS;
  params: any;
}

interface RpcResponse {
  id: string | number;
  result?: unknown;
  error?: { message: string };
}

async function handleRequest(payload: RpcRequest): Promise<RpcResponse> {
  const method = METHODS[payload.method];
  if (!method) {
    return { id: payload.id, error: { message: `Unknown method ${payload.method}` } };
  }
  try {
    const result = await method(payload.params);
    return { id: payload.id, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { id: payload.id, error: { message } };
  }
}

export async function startStdIOServer(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  rl.on('line', async (line) => {
    try {
      const payload = JSON.parse(line) as RpcRequest;
      const response = await handleRequest(payload);
      process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      process.stdout.write(`${JSON.stringify({ id: null, error: { message: 'invalid json' } })}\n`);
    }
  });
  rl.on('close', () => process.exit(0));
}

export async function startHttpServer(port: number): Promise<http.Server> {
  const server = http.createServer(async (req, res) => {
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
      const response = await handleRequest(payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: null, error: { message: 'invalid json' } }));
    }
  });
  await new Promise<void>((resolve) => {
    server.listen(port, resolve);
  });
  // eslint-disable-next-line no-console
  console.log(`HTTP MCP server listening on http://127.0.0.1:${port}/rpc`);
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
