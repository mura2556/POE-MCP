import { Counter, Histogram, Registry } from 'prom-client';

export const registry = new Registry();

export const mcpRequestsTotal = new Counter({
  name: 'mcp_requests_total',
  help: 'Total MCP RPC requests handled',
  labelNames: ['method', 'status'],
  registers: [registry],
});

export const mcpRequestDurationSeconds = new Histogram({
  name: 'mcp_request_duration_seconds',
  help: 'Duration of MCP RPC requests in seconds',
  labelNames: ['method'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export const etlRunSeconds = new Histogram({
  name: 'etl_run_seconds',
  help: 'Duration of ETL runs in seconds',
  labelNames: ['mode'],
  buckets: [10, 30, 60, 120, 300, 600, 1200],
  registers: [registry],
});

export const adapterRateLimitHitsTotal = new Counter({
  name: 'adapter_rate_limit_hits_total',
  help: 'Count of rate limit responses encountered by adapters',
  labelNames: ['adapter'],
  registers: [registry],
});

export const cacheHitsTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Cache hits for reusable artifacts',
  labelNames: ['cache'],
  registers: [registry],
});

export function resetMetrics(): void {
  registry.resetMetrics();
}
