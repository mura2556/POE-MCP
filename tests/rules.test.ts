import { describe, expect, it } from "vitest";

import { matchRulesForCraft, normalizeRuleSet } from "../src/data/rules.js";
import type {
  BaseItemDefinition,
  CraftingRuleSet,
  ModDefinition
} from "../src/data/types.js";

const base: BaseItemDefinition = {
  id: "test-base",
  name: "Test Armour",
  itemClass: "Armour",
  requiredLevel: 75,
  tags: ["armour", "str", "life"],
  implicitMods: [],
  influences: [],
  variant: "Default"
};

const lifeMod: ModDefinition = {
  id: "life-mod",
  name: "Fecund",
  tier: "T1",
  generationType: "prefix",
  description: "+120 to maximum Life",
  tags: ["life", "defence"],
  applicableTags: ["armour", "str"],
  minimumItemLevel: 82,
  domain: "item",
  group: "LocalLife",
  stats: ["+# to maximum Life"],
  spawnWeights: []
};

const casterMod: ModDefinition = {
  id: "spell-mod",
  name: "of Sorcery",
  tier: "T2",
  generationType: "suffix",
  description: "+60% increased Spell Damage",
  tags: ["spell", "caster"],
  applicableTags: ["wand", "staff"],
  minimumItemLevel: 72,
  domain: "item",
  group: "SpellDamage",
  stats: [],
  spawnWeights: []
};

const ruleSet: CraftingRuleSet = normalizeRuleSet({
  rules: {
    life: {
      id: "life",
      title: "Essence of Greed",
      description: "Essences guarantee a strong life roll.",
      tags: ["life", "armour"],
      conditions: ["Use on armour bases"],
      outcomes: ["Apply Screaming Essence of Greed"]
    },
    caster: {
      id: "caster",
      title: "Caster Fossils",
      description: "Use fossils to block attack modifiers.",
      tags: ["caster", "spell"],
      conditions: ["Use on caster bases"],
      outcomes: ["Apply Aetheric Fossil"]
    }
  },
  byTag: {}
});

describe("rules", () => {
  it("normalizes rule tags", () => {
    expect(ruleSet.byTag["life"]).toContain("life");
    expect(ruleSet.byTag["caster"]).toContain("caster");
  });

  it("matches rules based on base and mods", () => {
    const matches = matchRulesForCraft(ruleSet, base, [lifeMod]);
    const ids = matches.map((match) => match.rule.id);
    expect(ids).toContain("life");
    expect(ids).not.toContain("caster");
  });
});
