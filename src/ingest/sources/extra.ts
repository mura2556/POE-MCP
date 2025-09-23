import { normalizeRuleSet } from "../../data/rules.js";
import { loadDefaultBuilds } from "../../data/pob.js";
import type { CraftingRuleSet, PobBuildSummary } from "../../data/types.js";

const buildRules = (): CraftingRuleSet => {
  const rules: CraftingRuleSet = {
    rules: {
      "rule-essence-life": {
        id: "rule-essence-life",
        title: "Use Essences for High Life",
        description: "Essences of Greed guarantee a high tier life prefix on armour bases.",
        tags: ["life", "armour", "essence"],
        conditions: [
          "Base item has the armour tag",
          "Target modifier includes life"
        ],
        outcomes: [
          "Apply a Screaming or higher Essence of Greed before other crafting steps."
        ]
      },
      "rule-aetheric-fossil": {
        id: "rule-aetheric-fossil",
        title: "Aetheric Fossils for Spell Damage",
        description: "Fossils can block undesirable mods and boost caster outcomes.",
        tags: ["caster", "spell", "fossil"],
        conditions: [
          "Base item has caster tags",
          "Target modifier is spell-damage"
        ],
        outcomes: [
          "Socket Aetheric + Metallic fossils to focus caster prefixes."
        ]
      },
      "rule-attack-speed-bench": {
        id: "rule-attack-speed-bench",
        title: "Bench Craft Attack Speed",
        description: "The crafting bench can add mid-tier attack speed as a finishing touch.",
        tags: ["attack", "speed", "bench"],
        conditions: [
          "Suffix slot available",
          "Weapon base supports attack speed"
        ],
        outcomes: [
          "Use crafting bench (5 divine favour) for +14% attack speed suffix."
        ]
      }
    },
    byTag: {}
  };

  return normalizeRuleSet(rules);
};

const buildPobSummaries = (): Record<string, PobBuildSummary> => {
  const entries = loadDefaultBuilds();
  const record: Record<string, PobBuildSummary> = {};
  for (const build of entries) {
    record[build.id] = {
      id: build.id,
      name: build.name,
      characterClass: build.characterClass,
      mainSkill: build.mainSkill,
      dps: build.dps,
      poeVersion: build.poeVersion,
      items: build.items,
      tags: build.tags
    };
  }
  return record;
};

export interface ExtraDataResult {
  rules: CraftingRuleSet;
  builds: Record<string, PobBuildSummary>;
}

export const loadExtraData = async (): Promise<ExtraDataResult> => ({
  rules: buildRules(),
  builds: buildPobSummaries()
});
