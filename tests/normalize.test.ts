import { describe, expect, it } from "vitest";

import {
  chaosToDivine,
  normalizeItemName,
  scoreSearchMatch
} from "../src/data/normalize.js";

describe("normalizeItemName", () => {
  it("normalizes case and punctuation", () => {
    expect(normalizeItemName(" Divine Orb! ")).toBe("divine orb");
  });
});

describe("chaosToDivine", () => {
  it("converts chaos values using the default rate", () => {
    expect(chaosToDivine(180)).toBe(1);
  });
});

describe("scoreSearchMatch", () => {
  it("rewards exact matches", () => {
    expect(scoreSearchMatch("Chaos Orb", "Chaos Orb")).toBe(1);
  });

  it("returns zero for non matches", () => {
    expect(scoreSearchMatch("Chaos", "Divine Orb")).toBe(0);
  });
});
