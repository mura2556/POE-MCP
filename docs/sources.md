# Data sources

| Source | URL | License | Notes |
| --- | --- | --- | --- |
| Path of Building Community | https://github.com/PathOfBuildingCommunity/PathOfBuilding | MIT | Passive tree metadata, PoB encoding | 
| RePoE | https://github.com/brather1ng/RePoE | CC-BY-SA-4.0 | Canonical base/mod/gem/passive definitions |
| PyPoE | https://github.com/OmegaK2/PyPoE | MIT | GGPK extraction utilities and dat file helpers |
| Official PoE API | https://www.pathofexile.com/developer/docs/api | ToS-bound | Read-only league metadata and trade static endpoints; no automated searches |
| poe.ninja | https://poe.ninja | CC-BY-NC-4.0 | PoE1 `currencyoverview` + `itemoverview` endpoints; pin leagues with `POE_MCP_NINJA_LEAGUES` |
| Community PoB builds | Various GitHub gists/repos | Mixed (per entry) | Manifest records per-build provenance |

The ETL pipeline records the precise commit SHA, license text, checksum, and retrieval metadata in `manifest.json` for reproducibility. PoE2 data is explicitly filtered at the adapter layer and further guarded by validation.

## PoE1 allowlist vs PoE2 denylist

| Allowlisted PoE1 source | Purpose |
| --- | --- |
| `https://github.com/brather1ng/RePoE` | Canonical bases/mods/gems/passives |
| `https://github.com/PathOfBuildingCommunity/PathOfBuilding` | PoB PoE1 tree data and encode/decode logic |
| `https://github.com/OmegaK2/PyPoE` | GGPK tooling, dat helpers |
| `https://poe.ninja` | Economy snapshots and price history |
| `https://www.pathofexile.com/api/*` / `https://api.pathofexile.com/*` | Official trade + league metadata |

| Denylisted PoE2 indicator | Example |
| --- | --- |
| Repository slug | `PathOfBuilding-PoE2`, `PoE2` |
| Mechanics | `companion`, `rune`, `spearshard`, `spiritgem` |
| League markers | `poe2-alpha`, `poe2-beta` |

### How the guard works

- Every adapter calls `assertPoe1()` before network access. URLs outside the allowlist or matching the denylist abort the ETL run.
- Normalized entities embed `provenance.poe_version = "PoE1"` and per-source entries with the same flag.
- `verify_no_poe2()` scans `manifest.json`, dataset metadata, and all JSONL exports; any denylist hit causes `pnpm data:validate` (and CI) to fail with offending paths and tokens.
