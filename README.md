# poe-mcp

`poe-mcp` packages a production-grade Path of Exile (PoE1) knowledge base with a reproducible ETL pipeline, strict schemas, and a fully offline Model Context Protocol (MCP) server. The project ships curated data, validation tooling, binaries, and turnkey client configurations for the most popular MCP-enabled applications.

> 🚫 **PoE1-Only Guardrail**
> - ✅ [Path of Building Community (PoE1)](https://github.com/PathOfBuildingCommunity/PathOfBuilding)
> - ❌ [Path of Building PoE2 (explicitly excluded)](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2)
> - ✅ [RePoE](https://github.com/brather1ng/RePoE)
> - ✅ [PyPoE](https://github.com/OmegaK2/PyPoE)
> - ✅ [poe.ninja economy snapshots](https://poe.ninja/)
> - ✅ [Path of Exile developer API docs (stash/trade metadata)](https://www.pathofexile.com/developer/docs/api)

All validation and CI jobs fail fast if any PoE2 identifier, repository, or mechanic appears in the manifest or normalized data.

## Quick start

```bash
pnpm install
pnpm build
pnpm build:schemas
export POE_MCP_CLIENTS_ABS=$(pwd)
pnpm build:clients
pnpm build:bin
pnpm etl:all
pnpm data:validate
```

The commands above compile the TypeScript source, regenerate JSON Schema artifacts, produce multi-client MCP configs, build runnable binaries, execute the full ETL pipeline, and validate the resulting dataset. All outputs are deterministic and timestamped with `generated_at` metadata.

> **Note**
> `manifest.json` ships as a blank template; running the ETL pipeline overwrites it based on the rules described in `manifest.template.json`.

For an end-to-end walkthrough (installation, client wiring, and first tool calls) see [`docs/quickstart.md`](docs/quickstart.md).

### Install via Docker | npm | Homebrew | Scoop

Pick the distribution channel that best fits your environment (all variants preserve the PoE1-only validation gates):

| Channel | Install | Run |
| --- | --- | --- |
| Docker | `docker run -p 8765:8765 ghcr.io/<OWNER>/poe-mcp:latest` | Connect clients to `http://127.0.0.1:8765` (SSE endpoint `/sse`). |
| npm (global) | `npm i -g poe-mcp` | `poe-mcp etl:all` then `poe-mcp serve --transport http --port 8765`. |
| Homebrew (macOS) | `brew tap <OWNER>/poe-mcp` then `brew install poe-mcp` | `poe-mcp serve --transport stdio` for Claude/Cursor, or `--transport http` for SSE clients. |
| Scoop (Windows) | `scoop bucket add poe-mcp https://github.com/<OWNER>/scoop-poe-mcp` then `scoop install poe-mcp` | Launch via the installed `poe-mcp.cmd` shim and select transport. |

> Replace `<OWNER>` with the canonical GitHub owner that publishes the official release artifacts (see [Release process](#release-process)).

Reference templates for the Homebrew formula and Scoop manifest live under [`packaging/`](packaging/); the release automation updates downstream taps/buckets once the official secrets are configured.

### CLI overview

Once installed (either from source or via npm/Homebrew/Scoop), use the bundled CLI:

```bash
poe-mcp etl:all                               # full rebuild into data/<DATE>/
poe-mcp etl:incremental --league Affliction   # targeted refresh with explicit league override
poe-mcp serve --transport stdio               # stdio transport for Claude, Cursor, etc.
poe-mcp serve --transport http --metrics --health --port 8765  # HTTP + /rpc + /sse endpoints
poe-mcp offline --from ./release-snapshot --transport http     # serve an unpacked release bundle
poe-mcp verify:coverage                       # run PoE1 + coverage checks and emit coverage.{json,txt}
```

### Quick start by client

| Client | Copy command (macOS) | Config path | First call |
| --- | --- | --- | --- |
| Claude Desktop | `cp dist/clients/claude_desktop_config.json "~/Library/Application Support/Claude/claude_desktop_config.json"` | `~/Library/Application Support/Claude/claude_desktop_config.json` | Ask Claude to run `verify_coverage` from the MCP panel. |
| Cursor | `cp dist/clients/cursor.mcp.json ~/.cursor/mcp.json` | `~/.cursor/mcp.json` | Command palette → `poe-mcp: search_data BaseItem Amulet`. |
| LM Studio | `cp dist/clients/lmstudio.mcp.json "~/Library/Application Support/LM Studio/mcp.json"` | `~/Library/Application Support/LM Studio/mcp.json` | Tools → MCP → `search_data` on `Gem` for “Support”. |
| AnythingLLM | `cp dist/clients/anythingllm_mcp_servers.json "~/Library/Application Support/anythingllm-desktop/storage/plugins/anythingllm_mcp_servers.json"` | `~/Library/Application Support/anythingllm-desktop/storage/plugins/anythingllm_mcp_servers.json` | Agents → MCP connectors → click **Test** on `poe-mcp`. |
| Open WebUI (mcpo) | `cp dist/clients/openwebui+mcpo.compose.yaml ./docker-compose.poe-mcp.yaml` | `./docker-compose.poe-mcp.yaml` | In-chat command `/tool verify_coverage` once the compose stack is running. |

## Repository layout

```
data/
  2025-09-22/           # canonical snapshot (JSONL + Parquet)
  latest -> 2025-09-22  # symlink updated by `pnpm etl:all`
dist/clients/           # generated MCP client configurations
schema/                 # Zod sources + generated JSON Schema
src/adapters/           # data-source adapters (GitHub, poe.ninja, etc.)
src/etl/                # orchestrated ETL modules per upstream dataset
src/mcp/                # transport-agnostic MCP server implementation
src/validation/         # coverage + integrity checks
src/validate/           # PoE1 allow/deny guard modules
fixtures/               # item text + PoB code corpora for regression tests
docs/                   # source manifest, schema docs, client instructions
```

## Building the dataset

The ETL pipeline unifies the following upstream sources (with provenance captured in `manifest.json`):

- **RePoE** – stats, mods, bases, passives, gems.
- **Path of Building Community** – passive tree metadata, build encoding helpers.
- **PyPoE** – GGPK tooling inventory for deep-data extraction.
- **Official PoE APIs** – league metadata, trade-static definitions.
- **poe.ninja** – economy snapshots (currencies & items).
- **Curated PoB build corpus** – historical build coverage.

Run the full pipeline with:

```bash
pnpm etl:all
```

The command materializes normalized tables (JSONL + Parquet) in `data/<DATE>/` and refreshes `data/latest`. Incremental refreshes reuse `data/latest` as the sink via:

```bash
pnpm etl:incremental
```

> Need a specific economy league? Set `export POE_MCP_NINJA_LEAGUES="Affliction"` (comma-separated for multiple leagues) before running `pnpm etl:all`. The poe.ninja adapter only calls the PoE1 `currencyoverview` and `itemoverview` endpoints for the requested leagues.

> The PoE developer adapter is limited to read-only metadata (leagues and trade-static categories) and abides by the official API terms—avoid scripted trade searches or bulk stash polling.

### Validation

`pnpm data:validate` enforces:

- ≥99% coverage across bases, mods, gems, and passives relative to RePoE inputs.
- No PoE2 identifiers or mechanics.
- Every mod reachable from at least one crafting action.
- 50+ item-text fixtures parsed into canonical IDs.
- 25 PoB codes round-trip without data loss.
- ≥20 poe.ninja price points loaded for the active leagues.

The validation report is also exposed as an MCP tool (`verify_coverage`).

Running `pnpm data:validate` produces both `dist/coverage/coverage.json` and `dist/coverage/coverage.txt` for CI ingestion and human-readable summaries.

## MCP server

The compiled binary (`bin/poe-mcp`) exposes the following tools over stdio or HTTP JSON-RPC:

- `search_data`
- `get_schema`
- `item_parse`
- `pob_decode` / `pob_encode`
- `crafting_lookup`
- `economy_snapshot`
- `history_diff`
- `verify_coverage`

Start the server via:

```bash
pnpm mcp:start                 # stdio transport
node dist/index.cjs serve --transport http --port 8765  # HTTP transport
```

The HTTP transport exposes JSON-RPC 2.0 at `POST /rpc`, a Server-Sent Events stream at `GET /sse`, health reporting at `GET /health`, and Prometheus metrics at `GET /metrics` (enable via `--metrics`).

Minimal clients:

```bash
# Issue a JSON-RPC call via curl
curl -s http://127.0.0.1:8765/rpc \
  -H 'Content-Type: application/json' \
  -d '{"id":1,"method":"search_data","params":{"kind":"BaseItem","q":"Two-Toned Boots"}}'

# Consume the SSE stream
curl http://127.0.0.1:8765/sse
```

```ts
// Node.js example (run with: node --loader tsx)
import fetch from 'node-fetch';
import { readFile } from 'node:fs/promises';

const main = async () => {
  const payload = {
    id: 42,
    method: 'item_parse',
    params: { text: await readFile('fixtures/items/item_1.txt', 'utf-8') },
  };

  const response = await fetch('http://127.0.0.1:8765/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

console.log(await response.json());
};

main();
```

See [`docs/clients.md`](docs/clients.md) for per-application instructions and copy commands. All configs reference the project binary through a `{{ABS_PATH}}` placeholder; running `pnpm build:clients` rewrites the files with absolute paths.

### Crafting lookup examples

The `crafting_lookup` tool synthesizes strategies for a target item base. Each plan enumerates prerequisites (`inputs`), expected outcomes, and “fix unwanted” fallbacks.

1. **Spell-suppression boots (`Two-Toned Boots`)**
   - **Cheapest** – spam `Essence of Zeal` until suppression tiers align, then bench-craft movement speed. Fix unwanted: use the crafting bench `remove/add defence` to reroll a bricked suffix block.
   - **Fastest** – apply Eldritch Ichors/Embers for implicit suppression, then slam `Veiled Chaos Orb` and unveil movement speed. Fix unwanted: harvest `reforge speed, keeping suffixes`.
   - **Safest** – fractured suppression base → harvest `augment speed` once, finish with bench-crafted life. Fix unwanted: beastcraft `Wild Bristle Matron` to remove a random suffix before reapplying.

2. **Life + resist chest (`Astral Plate`)**
   - **Cheapest** – spam `Essence of Greed`, bench-craft triple resist. Fix unwanted: harvest `reforge life, more likely` while locking suffixes.
   - **Fastest** – apply `Guiding Resonator + Dense Fossil` spam, finish with `remove/add defence`. Fix unwanted: use meta-craft `Suffixes cannot be changed` → scour prefixes.
   - **Safest** – bench “prefixes/suffixes cannot be changed”, then harvest `augment life` followed by `augment resistance`. Fix unwanted: harvest `remove non-resistance add resistance`.

3. **Chaos DoT wand (`Convoking Wand`)**
   - **Cheapest** – alt spam until “+1 to Level of all Chaos Spell Skill Gems”, regal, multimod: `Can have up to 3 Crafted Modifiers`, `+2 to Chaos Skill Gem Levels`, `Damage over Time Multiplier`. Fix unwanted: bench `Remove crafted modifiers` and restart.
   - **Fastest** – essence spam `Essence of Delirium`, bench-craft `+1 to level of all spell skill gems`. Fix unwanted: harvest `reforge caster, more likely` while locking suffixes.
   - **Safest** – fractured +1 base, apply `Aetheric + Corroded Fossils` for caster suffix bias, finish with veiled chaos for trigger. Fix unwanted: use `Remove/Add caster` to repair a misaligned prefix.

## CLI scripts

- `pnpm etl:all` – orchestrate all extraction modules and refresh `data/<DATE>/`.
- `pnpm etl:incremental` – re-run targeted updates into `data/latest`.
- `pnpm data:validate` – run schema, PoE1-only, PoB, and economy coverage checks.
- `pnpm build:clients` – regenerate client configs and Windows launchers.
- `pnpm build:bin` – rebuild the cross-platform binary wrappers.

## Data formats & schemas

Zod schemas live in `src/schema/zod.ts`; the script `pnpm build:schemas` emits corresponding JSON Schema documents in `schema/json/*.schema.json`. Each table is persisted both as `*.jsonl` and `*.parquet` (with a single-row JSON payload column for compatibility with downstream analytics tooling).

DuckDB helpers in [`scripts/duckdb.sql`](scripts/duckdb.sql) materialize temporary tables and indices for interactive analysis:

```bash
python - <<'PY'
import duckdb
con = duckdb.connect()
script = open('scripts/duckdb.sql').read()
for statement in [stmt.strip() for stmt in script.split(';') if stmt.strip()]:
    con.execute(statement)
print(con.execute('SELECT COUNT(*) FROM mods').fetchone())
PY
```

## Binaries & runners

`pnpm build:bin` generates:

- `bin/poe-mcp` – POSIX executable (Node.js shim) launching the compiled MCP server.
- `bin/poe-mcp.cmd` – Windows launcher invoking Node.js with the same entrypoint.

The script is designed to integrate with packaging tools such as `pkg` or `nexe` if a native binary is required; drop the compiled artifact into `bin/` and the generated configs will adopt it automatically.

## Security & SBOM

- Software Bill of Materials: `pnpm security:sbom` writes `dist/security/sbom.json`. Releases attach the same CycloneDX document—verify with `jq '.metadata.component.name' dist/security/sbom.json`.
- Container scanning: `trivy image ghcr.io/<OWNER>/poe-mcp:latest --severity HIGH,CRITICAL` (mirrors the CI gate).
- Static analysis: GitHub Actions runs CodeQL on every push/PR and Dependabot keeps npm + GitHub Actions pinned.

## Testing

```bash
pnpm test
```

Vitest suites cover ETL normalization, manifest metadata, crafting lookups, MCP tool behavior, and fixture-driven regressions for item parsing and PoB encoding.

## Release process

The automated release workflow (`.github/workflows/release.yml`) is restricted to the official maintainer (`OFFICIAL_OWNER` in workflow env). To publish a new build:

1. Ensure `pnpm-lock.yaml` is committed and that `pnpm build`, `pnpm etl:all`, and `pnpm data:validate` succeed locally.
2. Trigger the **Release** workflow via *Actions → Release → Run workflow* and optionally provide a tag (for example `v0.1.1`). If omitted, the workflow uses the version from `package.json`.
3. The workflow rebuilds the project, reruns the PoE1 validation gates, executes the full ETL, packages `dist/clients`, `manifest.json`, coverage reports, and a `poe-mcp-src.zip` archive, and attaches them to the GitHub Release.
4. Downstream automation publishes the npm package, Docker image, Homebrew tap PR, and Scoop manifest (guarded to run only for the canonical owner and when required secrets are present).

> Forks should update the `OFFICIAL_OWNER` value in the workflows or leave it untouched to prevent accidental publishing from non-official repositories.

## Licensing & provenance

Each upstream dependency is recorded in `manifest.json` with URL, commit, license, and data hashes. An aggregated SPDX report is available in `LICENSES.txt`. The repository only targets PoE1 data (up to the 2025-09-22 snapshot); PoE2 identifiers trigger validation failures.
