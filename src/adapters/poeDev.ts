import fetch from 'node-fetch';
import type { RequestInit } from 'node-fetch';
import { loadConfig } from '../config/index.js';
import { assertPoe1 } from '../validate/noPoe2.js';

async function poeRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const cfg = loadConfig();
  assertPoe1(url, `poe.dev:${url}`, 'url');
  const headers: Record<string, string> = {
    'User-Agent': 'poe-mcp/0.1 (+https://github.com/example/poe-mcp)',
    Accept: 'application/json',
  };
  if (cfg.poeSessionId) {
    headers.Cookie = `POESESSID=${cfg.poeSessionId}`;
  }
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } });
  if (!response.ok) {
    throw new Error(`Failed request ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

export interface TradeStatic {
  result: Array<{ id: string; label: string; entries: Array<{ id: string; text: string }> }>;
}

export async function fetchTradeStatic(endpoint: string): Promise<TradeStatic> {
  return poeRequest<TradeStatic>(`https://www.pathofexile.com/api/trade/data/${endpoint}`);
}

export interface LeagueInfo {
  id: string;
  realm: string;
  url: string;
  startAt: string;
  endAt?: string;
}

export async function fetchLeagues(): Promise<LeagueInfo[]> {
  return poeRequest<LeagueInfo[]>('https://api.pathofexile.com/leagues?type=main&compact=1');
}
