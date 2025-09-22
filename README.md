# poe-mcp

`poe-mcp` packages a production-grade Path of Exile (PoE1) knowledge base with a reproducible ETL pipeline, strict schemas, and a fully offline Model Context Protocol (MCP) server. The project ships curated data, validation tooling, binaries, and turnkey client configurations for the most popular MCP-enabled applications.

## Quick start

```bash
pnpm install
pnpm build
pnpm build:schemas
pnpm build:clients
pnpm build:bin
pnpm etl:all
pnpm data:validate
```

The commands above compile the TypeScript source, regenerate JSON Schema artifacts, produce multi-client MCP configs, build runnable binaries, execute the full ETL pipeline, and validate the resulting dataset. All outputs are deterministic and timestamped with `generated_at` metadata.

> **Note**
> `manifest.json` ships as a blank template; running the ETL pipeline overwrites it based on the rules described in `manifest.template.json`.

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
src/validation/         # coverage + PoE2 guardrails
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

### Validation

`pnpm data:validate` enforces:

- ≥99% coverage across bases, mods, gems, and passives relative to RePoE inputs.
- No PoE2 identifiers or mechanics.
- Every mod reachable from at least one crafting action.
- 50+ item-text fixtures parsed into canonical IDs.
- 25 PoB codes round-trip without data loss.
- ≥20 poe.ninja price points loaded for the active leagues.

The validation report is also exposed as an MCP tool (`verify_coverage`).

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
node dist/index.js serve --transport http --port 8765  # HTTP transport
```

See [`docs/clients.md`](docs/clients.md) for per-application instructions and copy commands. All configs reference the project binary through a `{{ABS_PATH}}` placeholder; running `pnpm build:clients` rewrites the files with absolute paths.

## CLI scripts

- `pnpm etl:all` – orchestrate all extraction modules and refresh `data/<DATE>/`.
- `pnpm etl:incremental` – re-run targeted updates into `data/latest`.
- `pnpm data:validate` – run schema, PoE1-only, PoB, and economy coverage checks.
- `pnpm build:clients` – regenerate client configs and Windows launchers.
- `pnpm build:bin` – rebuild the cross-platform binary wrappers.

## Data formats & schemas

Zod schemas live in `src/schema/zod.ts`; the script `pnpm build:schemas` emits corresponding JSON Schema documents in `schema/json/*.schema.json`. Each table is persisted both as `*.jsonl` and `*.parquet` (with a single-row JSON payload column for compatibility with downstream analytics tooling).

## Binaries & runners

`pnpm build:bin` generates:

- `bin/poe-mcp` – POSIX executable (Node.js shim) launching the compiled MCP server.
- `bin/poe-mcp.cmd` – Windows launcher invoking Node.js with the same entrypoint.

The script is designed to integrate with packaging tools such as `pkg` or `nexe` if a native binary is required; drop the compiled artifact into `bin/` and the generated configs will adopt it automatically.

## Testing

```bash
pnpm test
```

Vitest suites cover ETL normalization, manifest metadata, crafting lookups, MCP tool behavior, and fixture-driven regressions for item parsing and PoB encoding.

## Licensing & provenance

Each upstream dependency is recorded in `manifest.json` with URL, commit, license, and data hashes. An aggregated SPDX report is available in `LICENSES.txt`. The repository only targets PoE1 data (up to the 2025-09-22 snapshot); PoE2 identifiers trigger validation failures.
