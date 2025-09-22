import fetch from 'node-fetch';
import { DateTime } from 'luxon';

export interface NinjaLine {
  id: string;
  name: string;
  chaosValue: number;
  divineValue: number | null;
  detailsId: string;
  sparkline?: { data: number[] };
}

export interface NinjaResponse {
  lines: NinjaLine[];
  language: { name: string };
  currencyDetails?: Array<{ id: number; name: string }>;
}

export interface NinjaSnapshot {
  league: string;
  generatedAt: string;
  kind: string;
  lines: NinjaLine[];
}

export async function fetchNinjaOverview(league: string, type: string): Promise<NinjaSnapshot> {
  const url = `https://poe.ninja/api/data/${type}overview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch poe.ninja data ${response.status}`);
  }
  const json = (await response.json()) as NinjaResponse;
  return {
    league,
    generatedAt: DateTime.utc().toISO(),
    kind: type,
    lines: json.lines,
  };
}
