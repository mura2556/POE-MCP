import { normalizeTag } from "../../data/normalize.js";
import type {
  BaseItemDefinition,
  GemDefinition,
  ModDefinition,
  TagDefinition
} from "../../data/types.js";

const toRecord = <T extends { id: string }>(entries: T[]): Record<string, T> => {
  const record: Record<string, T> = {};
  for (const entry of entries) {
    record[entry.id] = entry;
  }
  return record;
};

const baseMods: ModDefinition[] = [
  {
    id: "mod-prefix-life-t1",
    name: "Fecund",
    tier: "T1",
    generationType: "prefix",
    description: "+125 to maximum Life",
    tags: ["life", "defence"],
    applicableTags: ["armour", "str", "str/int"],
    minimumItemLevel: 82,
    domain: "item",
    group: "LocalLife",
    stats: ["+# to maximum Life"],
    spawnWeights: [
      { tag: "default", weight: 1000 },
      { tag: "no_life", weight: 0 }
    ]
  },
  {
    id: "mod-suffix-resist-all-t2",
    name: "of the Order",
    tier: "T2",
    generationType: "suffix",
    description: "+40% to all Elemental Resistances",
    tags: ["resistance", "defence"],
    applicableTags: ["armour", "jewellery", "shield"],
    minimumItemLevel: 78,
    domain: "item",
    group: "ElementalResistances",
    stats: ["+#% to Fire Resistance", "+#% to Cold Resistance", "+#% to Lightning Resistance"],
    spawnWeights: [
      { tag: "default", weight: 1000 },
      { tag: "no_resistance", weight: 0 }
    ]
  },
  {
    id: "mod-suffix-attack-speed-t3",
    name: "of Acceleration",
    tier: "T3",
    generationType: "suffix",
    description: "+14% increased Attack Speed",
    tags: ["attack", "speed"],
    applicableTags: ["weapon", "dex", "bow"],
    minimumItemLevel: 70,
    domain: "item",
    group: "LocalAttackSpeed",
    stats: ["+#% increased Attack Speed"],
    spawnWeights: [
      { tag: "weapon", weight: 800 },
      { tag: "default", weight: 1000 }
    ]
  },
  {
    id: "mod-prefix-spell-damage-t1",
    name: "Flaring",
    tier: "T1",
    generationType: "prefix",
    description: "+72% increased Spell Damage",
    tags: ["spell", "caster"],
    applicableTags: ["wand", "staff", "int"],
    minimumItemLevel: 82,
    domain: "item",
    group: "LocalSpellDamage",
    stats: ["+#% increased Spell Damage"],
    spawnWeights: [
      { tag: "caster", weight: 800 },
      { tag: "default", weight: 1000 }
    ]
  }
];

const baseItems: BaseItemDefinition[] = [
  {
    id: "Metadata/Items/Armours/BodyArmours/BodyStrInt5",
    name: "Saintly Chainmail",
    itemClass: "Body Armour",
    requiredLevel: 82,
    tags: ["armour", "str/int", "body_armour"],
    implicitMods: ["+12% to all Elemental Resistances"],
    influences: ["shaper"],
    variant: "Default"
  },
  {
    id: "Metadata/Items/Armours/Gloves/GlovesStr6",
    name: "Titan Gauntlets",
    itemClass: "Gloves",
    requiredLevel: 68,
    tags: ["armour", "str", "gloves"],
    implicitMods: [],
    influences: [],
    variant: "Default"
  },
  {
    id: "Metadata/Items/Rings/RingDexInt11",
    name: "Opal Ring",
    itemClass: "Ring",
    requiredLevel: 80,
    tags: ["jewellery", "int", "dex", "ring"],
    implicitMods: ["15% increased Elemental Damage"],
    influences: ["elder"],
    variant: "Default"
  },
  {
    id: "Metadata/Items/Wands/WandInt7",
    name: "Imbued Wand",
    itemClass: "Wand",
    requiredLevel: 59,
    tags: ["weapon", "wand", "int"],
    implicitMods: ["10% increased Spell Damage"],
    influences: [],
    variant: "Default"
  },
  {
    id: "Metadata/Items/Armours/Helmets/HelmetStrDex5",
    name: "Royal Burgonet",
    itemClass: "Helmet",
    requiredLevel: 65,
    tags: ["armour", "str", "helmet"],
    implicitMods: ["Adds 10 to 15 Physical Damage to Attacks"],
    influences: ["warlord"],
    variant: "Default"
  }
];

const baseGems: GemDefinition[] = [
  {
    id: "Metadata/Items/Gems/SkillGemRighteousFire",
    name: "Righteous Fire",
    primaryAttribute: "Strength",
    tags: ["fire", "spell", "aura"],
    description: "Burns enemies around you while burning yourself.",
    gemTags: ["spell", "area", "fire"],
    weaponRestrictions: []
  },
  {
    id: "Metadata/Items/Gems/SkillGemEssenceDrain",
    name: "Essence Drain",
    primaryAttribute: "Intelligence",
    tags: ["chaos", "spell", "duration"],
    description: "Fires a projectile that applies a damaging chaos effect.",
    gemTags: ["spell", "projectile", "duration"],
    weaponRestrictions: ["wand", "bow"]
  },
  {
    id: "Metadata/Items/Gems/SupportGemIncreasedCriticalDamage",
    name: "Increased Critical Damage Support",
    primaryAttribute: "Dexterity",
    tags: ["support", "crit"],
    description: "Supports skills to grant more critical strike multiplier.",
    gemTags: ["support", "critical"],
    weaponRestrictions: []
  }
];

const staticTags: TagDefinition[] = [
  {
    id: "tag-armour",
    label: "Armour",
    category: "item",
    description: "Armour-based equipment",
    synonyms: ["armor"]
  },
  {
    id: "tag-life",
    label: "Life",
    category: "mod",
    description: "Life modifiers",
    synonyms: []
  },
  {
    id: "tag-resistance",
    label: "Resistance",
    category: "mod",
    description: "Elemental resistance modifiers",
    synonyms: ["res"]
  },
  {
    id: "tag-caster",
    label: "Caster",
    category: "mod",
    description: "Caster-related modifiers",
    synonyms: []
  },
  {
    id: "tag-weapon",
    label: "Weapon",
    category: "item",
    description: "Weapons",
    synonyms: []
  }
];

const buildDynamicTags = (): Record<string, TagDefinition> => {
  const byId: Record<string, TagDefinition> = {};
  const register = (tag: TagDefinition) => {
    byId[tag.id] = tag;
  };

  for (const tag of staticTags) {
    register(tag);
  }

  const ensureTag = (value: string, category: TagDefinition["category"]) => {
    const normalized = normalizeTag(value);
    const id = `tag-${normalized}`;
    if (!byId[id]) {
      register({ id, label: value, category });
    }
  };

  for (const base of baseItems) {
    for (const tag of base.tags) {
      ensureTag(tag, "item");
    }
  }

  for (const mod of baseMods) {
    for (const tag of mod.tags) {
      ensureTag(tag, "mod");
    }
    for (const tag of mod.applicableTags) {
      ensureTag(tag, "item");
    }
  }

  for (const gem of baseGems) {
    for (const tag of gem.tags) {
      ensureTag(tag, "gem");
    }
  }

  return byId;
};

export interface RePoeLoadResult {
  mods: Record<string, ModDefinition>;
  bases: Record<string, BaseItemDefinition>;
  gems: Record<string, GemDefinition>;
  tags: Record<string, TagDefinition>;
}

export const loadRePoeSnapshot = async (): Promise<RePoeLoadResult> => ({
  mods: toRecord(baseMods),
  bases: toRecord(baseItems),
  gems: toRecord(baseGems),
  tags: buildDynamicTags()
});
