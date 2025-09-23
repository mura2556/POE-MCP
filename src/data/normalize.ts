const whitespaceRegex = /\s+/g;
const punctuationRegex = /[^a-z0-9\s]/g;
const slugRegex = /[^a-z0-9]+/g;

export const normalizeItemName = (name: string): string =>
  name
    .toLowerCase()
    .replace(punctuationRegex, "")
    .replace(whitespaceRegex, " ")
    .trim();

export const createNameSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/'/g, "")
    .replace(slugRegex, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const normalizeTag = (tag: string): string => createNameSlug(tag);

export const normalizeCategory = (category: string): string =>
  createNameSlug(category);

export const roundChaosValue = (value: number): number =>
  Math.round(value * 100) / 100;

export const chaosToDivine = (chaos: number, rate = 180): number =>
  roundChaosValue(chaos / rate);

export const scoreSearchMatch = (query: string, candidate: string): number => {
  const normalizedQuery = normalizeItemName(query);
  const normalizedCandidate = normalizeItemName(candidate);

  if (normalizedCandidate === normalizedQuery) {
    return 1;
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return normalizedQuery.length / normalizedCandidate.length;
  }

  return 0;
};
