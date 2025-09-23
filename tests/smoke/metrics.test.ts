import { describe, expect, it } from 'vitest';
import fetch from 'node-fetch';
import { startHttpServer, stopHttpServer } from '../../src/mcp/server.js';
import { resetMetrics } from '../../src/utils/metrics.js';

function getPort(server: import('node:http').Server): number {
  const address = server.address();
  if (address && typeof address !== 'string') {
    return address.port;
  }
  throw new Error('Failed to determine server port');
}

describe('metrics exposure', () => {
  it('increments counters and exposes Prometheus metrics', async () => {
    resetMetrics();
    const server = await startHttpServer({ port: 0, enableMetrics: true, enableHealth: true });
    const port = getPort(server);
    const rpcPayload = {
      id: 1,
      method: 'get_schema',
      params: { kind: 'baseItem' },
    };
    const rpcResponse = await fetch(`http://127.0.0.1:${port}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rpcPayload),
    });
    expect(rpcResponse.status).toBe(200);
    const metricsResponse = await fetch(`http://127.0.0.1:${port}/metrics`);
    expect(metricsResponse.status).toBe(200);
    const body = await metricsResponse.text();
    expect(body).toContain('mcp_requests_total');
    expect(body).toMatch(/mcp_requests_total\{[^}]*method="get_schema"[^}]*status="success"[^}]*} 1/);
    await stopHttpServer(server);
  });
});
