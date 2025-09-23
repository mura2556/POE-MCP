import crypto from 'node:crypto';

export interface ParsedItem {
  id: string;
  baseItemId: string;
  rarity: string;
  identified: boolean;
  corrupted: boolean;
  influences: string[];
  modifiers: string[];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function parseItemText(text: string): ParsedItem {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const rarityLine = lines.find((line) => line.startsWith('Rarity:')) ?? 'Rarity: Unknown';
  const rarity = rarityLine.split(':')[1]?.trim() ?? 'Unknown';
  const baseLine = lines.find((line, index) => index > lines.indexOf(rarityLine) && line.length > 0) ?? 'Unknown';
  const identified = !lines.includes('Unidentified');
  const corrupted = lines.includes('Corrupted');
  const influenceMatches = lines
    .filter((line) => /(Shaper|Elder|Crusader|Redeemer|Hunter|Warlord|Fractured|Synthesised|Eater|Searing)/i.test(line))
    .map((line) => line.replace(/[^A-Za-z]/g, ''));
  const modSection = lines.slice(lines.indexOf('--------') + 1);
  const modifiers = modSection.filter((line) => line && !line.startsWith('Level:') && !line.startsWith('Quality:') && line !== 'Corrupted');
  const baseItemId = slugify(baseLine) || crypto.randomUUID();
  return {
    id: crypto.createHash('sha1').update(text).digest('hex'),
    baseItemId,
    rarity,
    identified,
    corrupted,
    influences: Array.from(new Set(influenceMatches.map((line) => slugify(line)))).filter(Boolean),
    modifiers,
  };
}
