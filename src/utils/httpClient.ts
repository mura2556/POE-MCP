import fetch, { type RequestInit, type Response } from 'node-fetch';
import { setTimeout as delay } from 'node:timers/promises';
import { URL } from 'node:url';
import { createRequestContext } from './logger.js';
import { adapterRateLimitHitsTotal } from './metrics.js';

const robotsCache = new Map<string, { fetchedAt: number; disallow: string[] }>();

async function ensureRobotsAllowed(targetUrl: string, adapter: string): Promise<void> {
  const url = new URL(targetUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  const cacheKey = `${url.origin}`;
  const cached = robotsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < 1000 * 60 * 60) {
    if (cached.disallow.some((entry) => url.pathname.startsWith(entry))) {
      throw new Error(`Robots.txt disallows ${url.pathname} for adapter ${adapter}`);
    }
    return;
  }
  try {
    const robotsUrl = `${url.origin}/robots.txt`;
    const response = await fetch(robotsUrl, { headers: { 'User-Agent': 'poe-mcp/0.1' } });
    if (!response.ok) {
      robotsCache.set(cacheKey, { fetchedAt: Date.now(), disallow: [] });
      return;
    }
    const text = await response.text();
    const lines = text.split('\n').map((line) => line.trim());
    const disallow: string[] = [];
    let applies = false;
    for (const line of lines) {
      if (line.startsWith('#') || line.length === 0) continue;
      if (line.toLowerCase().startsWith('user-agent:')) {
        const agent = line.split(':', 2)[1]?.trim().toLowerCase() ?? '';
        applies = agent === '*' || agent === 'poe-mcp';
      } else if (applies && line.toLowerCase().startsWith('disallow:')) {
        const path = line.split(':', 2)[1]?.trim() ?? '';
        if (path) {
          disallow.push(path);
        }
      }
    }
    robotsCache.set(cacheKey, { fetchedAt: Date.now(), disallow });
    if (disallow.some((entry) => url.pathname.startsWith(entry))) {
      throw new Error(`Robots.txt disallows ${url.pathname} for adapter ${adapter}`);
    }
  } catch (error) {
    // if robots fetch fails, allow request but continue politely
    robotsCache.set(cacheKey, { fetchedAt: Date.now(), disallow: [] });
  }
}

export interface FetchRetryOptions {
  adapter: string;
  requestId?: string;
  maxRetries?: number;
  initialBackoffMs?: number;
}

export async function fetchWithRetry(url: string, init: RequestInit = {}, options: FetchRetryOptions): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  let attempt = 0;
  let backoff = options.initialBackoffMs ?? 500;
  const ctx = createRequestContext(`adapter:${options.adapter}`, { requestId: options.requestId, provenance: url });
  await ensureRobotsAllowed(url, options.adapter);
  while (attempt <= maxRetries) {
    const startedAt = Date.now();
    try {
      const response = await fetch(url, init);
      if (response.status === 429 || response.status === 503) {
        adapterRateLimitHitsTotal.inc({ adapter: options.adapter });
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfter = retryAfterHeader ? Number.parseFloat(retryAfterHeader) * 1000 : backoff;
        ctx.warn('Rate limit encountered', { status: response.status, retryAfter });
        await delay(retryAfter || backoff);
        backoff *= 2;
        attempt += 1;
        continue;
      }
      if (response.status >= 500 && response.status < 600) {
        ctx.warn('Upstream service error', { status: response.status, attempt });
        await delay(backoff);
        backoff *= 2;
        attempt += 1;
        continue;
      }
      ctx.info('HTTP request success', { durationMs: Date.now() - startedAt, status: response.status });
      return response;
    } catch (error) {
      ctx.warn('Fetch attempt failed', { error: error instanceof Error ? error.message : String(error), attempt });
      if (attempt >= maxRetries) {
        throw error;
      }
      await delay(backoff);
      backoff *= 2;
      attempt += 1;
    }
  }
  throw new Error(`Failed to fetch ${url} after ${maxRetries + 1} attempts`);
}
