# Schema reference

All core entities are defined via [Zod](https://github.com/colinhacks/zod) in `src/schema/zod.ts`. `pnpm build:schemas` emits JSON Schema documents under [`schema/json`](../schema/json) consumed by MCP clients and validation tooling.

Quick inspection tips:

- `schema/json/BaseItem.schema.json` – `provenance.sources[]` includes `url`, `ref`, `poe_version`, and `poe_version` is always `PoE1`.
- `schema/json/Mod.schema.json` – `conditions` describe spawn domains, and `history[]` records `league_from`/`league_to` ranges.
- `schema/json/CraftAction.schema.json` – `strategies.cheapest/fastest/safest` enumerate `steps[]` (each with `preconditions` and optional `fix_unwanted`).

| Entity | Description |
| --- | --- |
| BaseItem | Normalized base item definitions with implicits, tags, and spawn weights |
| UniqueItem | Unique variants of bases including flavour text and drop metadata |
| Mod | Affixes with stat ranges, generation context, weights, and history |
| ModGroup | Grouping metadata used by crafting logic |
| Gem | Active/support gems including alternate qualities |
| PassiveNode | Passive skill tree nodes and ascendancy data |
| Ascendancy | Ascendancy class definitions |
| Mastery | Passive mastery nodes with available allocations |
| BenchCraft / Essence / Fossil / HarvestMod / Beastcraft / EldritchImplicit / VeiledMod | Crafting verbs with cost envelopes and constraints |
| LabEnchant / HeistEnchant / CorruptionOutcome / RecombinatorRule | Specialized crafting and transformation mechanics |
| TradeListing | Normalized trade listing structure |
| NinjaPricePoint | poe.ninja snapshot lines with chaos/divine values |
| CurrencyDigest | Aggregated currency index with sparklines |
| PoBBuild | Curated PoB builds with provenance and tags |
| BuildSnapshot | Versioned snapshot of PoB builds |
| ItemParsed | Item text parsing result linking to canonical IDs |
| CraftAction | Derived crafting actions (bench, essences, etc.) |
| RemoveAddPath | Supported remove/add sequences for fixing mods |
| ProbabilityHint | Qualitative spawn probability bands |

Each record contains a `history[]` array capturing league/patch ranges, `generated_at` metadata, and (where applicable) `league_name` annotations.
