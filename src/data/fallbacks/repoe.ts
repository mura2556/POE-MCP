export const fallbackRePoE = {
  bases: [
    {
      id: 'metadata/items/amulet/amulet',
      name: 'Amber Amulet',
      itemClass: 'Amulets',
      tags: ['amulet', 'attribute', 'dexterity'],
      levelRequirement: 8,
      implicits: ['+(20-30) to Dexterity'],
    },
    {
      id: 'metadata/items/weapon/one_hand_sword',
      name: 'Jewelled Foil',
      itemClass: 'One Hand Swords',
      tags: ['weapon', 'one_hand_weapon', 'sword'],
      levelRequirement: 68,
      implicits: ['40% increased Global Accuracy Rating'],
    }
  ],
  uniques: [
    {
      id: 'Metadata/Items/Amulet/Amulet5',
      name: 'Astramentis',
      itemClass: 'Amulets',
      tags: ['amulet', 'unique'],
      levelRequirement: 20,
      implicits: ['+(10-16) to all Attributes'],
      flavourText: ['An unbreakable bond between the sky and the earth.'],
    }
  ],
  mods: [
    {
      id: 'Dexterity',
      name: 'of Dexterity',
      group: 'attribute',
      stats: [
        { id: 'base_dexterity', min: 10, max: 30 }
      ],
      tags: ['amulet', 'dexterity'],
      domains: ['item'],
      generationType: 'suffix',
      spawnWeights: [
        { tag: 'amulet', weight: 1000 }
      ],
      statRanges: [],
      history: [],
      generationContext: {
        tags: ['dexterity'],
        domain: 'item',
        generationType: 'suffix',
        spawnWeights: [{ tag: 'amulet', weight: 1000 }],
        statRanges: [{ min: 10, max: 30, value: null }],
        sources: ['RePoE'],
      },
    }
  ],
  modGroups: [
    {
      id: 'attribute',
      name: 'Attribute Mods',
      domain: 'item',
      tags: ['dexterity'],
    }
  ],
  gems: [
    {
      id: 'Metadata/Items/Gems/SkillGemFireball',
      name: 'Fireball',
      gemType: 'active',
      tags: ['spell', 'projectile'],
      domains: ['gems'],
      alternateQualities: [],
      implicits: [],
      levelRequirement: 1,
    }
  ],
  passives: [
    {
      id: 'passive-node-dex',
      name: 'Agility',
      nodeType: 'normal',
      tags: ['dexterity'],
      domains: ['passive'],
      generationType: 'allocated',
      spawnWeights: [],
      statRanges: [],
      conditions: [],
      rollTiers: [],
      sources: ['RePoE'],
      history: [],
    }
  ],
  ascendancies: [
    {
      id: 'ascendancy-elementalist',
      name: 'Elementalist',
      classId: 3,
      className: 'Witch',
      tags: ['ascendancy'],
      domains: ['ascendancy'],
      generationType: 'ascendancy',
      spawnWeights: [],
      statRanges: [],
      conditions: [],
      rollTiers: [],
      sources: ['RePoE'],
      history: [],
    }
  ],
  masteries: [
    {
      id: 'mastery-elemental',
      name: 'Elemental Mastery',
      effect: '+30% increased Elemental Damage',
      allocations: ['elemental'],
      tags: ['mastery'],
      domains: ['passive'],
      generationType: 'mastery',
      spawnWeights: [],
      statRanges: [],
      conditions: [],
      rollTiers: [],
      sources: ['RePoE'],
      history: [],
    }
  ],
};
