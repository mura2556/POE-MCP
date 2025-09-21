# Path of Exile MCP Server

This repository bootstraps a development-friendly [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that exposes curated Path of Exile economy data. It bundles an offline data snapshot, a stub ingestion pipeline, HTTP endpoints, and a suite of MCP tools so that clients can experiment with querying item prices without contacting external services.

## Highlights

- **TypeScript-first project** with strict compilation, Vitest-based unit tests, and hot reload via `tsx`.
- **Snapshot-aware data context** that can ingest new data, list available snapshots, and expose a cached price index.
- **MCP tools** for price lookups, fuzzy searching, snapshot listing, and refreshing the cached data model.
- **Optional Fastify HTTP server** for REST-style queries in addition to the stdio MCP transport.
- **Documented ingestion pipeline** that assembles deterministic sample data using stubbed RePoE and Path of Building loaders.

## Repository layout

```text
src/
  config/          Environment handling and validation
  data/            Data models, normalization helpers, and price index
  ingest/          Offline ingestion pipeline and bundled snapshots
  logging/         Pino logger factory
  mcp/             MCP server bootstrap and tool registrations
  server/          HTTP + MCP runtime entrypoints
  examples/        Example environment configuration snippets
  ...
tests/             Vitest unit and integration tests
```

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Review configuration**

   Copy `.env.example` to `.env` (or export the variables in your shell) if you need to customize the defaults.

   ```bash
   cp .env.example .env
   ```

3. **Run the offline ingestion pipeline** (optional – a seed snapshot is already provided)

   ```bash
   npm run ingest
   ```

4. **Start the development server** with hot reload and the HTTP API enabled:

   ```bash
   npm run dev
   ```

   For a production-style build that only runs the compiled code use:

   ```bash
   npm run build
   npm start
   ```

## Available npm scripts

| Script            | Description |
|-------------------|-------------|
| `npm run build`   | Compile TypeScript into the `dist/` directory. |
| `npm run dev`     | Start the stdio MCP server and HTTP API using `tsx` watch mode. |
| `npm start`       | Execute the compiled server from `dist/`. |
| `npm run ingest`  | Execute the offline ingestion pipeline and write a new snapshot to `src/ingest/out`. |
| `npm run test`    | Run the Vitest suite. |

## MCP tools

The MCP server registers the following tools:

- `price_lookup` – fetch a normalized price entry for a given item name (with optional exact matching).
- `search_prices` – perform fuzzy matching against the price index and return the best matches.
- `list_snapshots` – enumerate stored snapshots with metadata.
- `refresh_snapshot` – reload the latest snapshot from disk and rebuild the price index cache.

All tools return structured JSON in addition to plain-text output for compatibility.

## HTTP API (optional)

When `HTTP_ENABLED=true` the Fastify server exposes three endpoints:

- `GET /health` – readiness probe returning the loaded snapshot metadata.
- `GET /prices/:name` – fetch a single item's structured price information.
- `GET /prices?q=chaos&limit=5` – fuzzy search across the price index.
- `GET /snapshots` – list available snapshots and their metadata.

## Ingestion pipeline overview

The pipeline in `src/ingest/` demonstrates how stubbed RePoE data and Path of Building builds can be combined to produce a deterministic snapshot:

1. Load RePoE-style base item definitions (`src/data/repoe.ts`).
2. Load example PoB builds (`src/data/pob.ts`).
3. Compute usage popularity and enrich price records with confidence and listing estimates.
4. Persist the snapshot to `src/ingest/out/`, keeping both a timestamped file and `latest.json` for quick reloads.

A seed snapshot (`src/ingest/out/initial-snapshot.json`) is committed so the server can boot offline before any ingestion runs.

## Further reading

- [`docs/usage.md`](docs/usage.md) – step-by-step walkthroughs for common workflows.
- [`src/examples/`](src/examples/) – environment variable snippets for quick experimentation.

## Testing

Run the Vitest suite with:

```bash
npm run test
```

The tests cover normalization utilities, snapshot management, ingestion output, and MCP tool registration behavior.

## License

Released under the MIT License. See [`LICENSE`](LICENSE) if present or configure as needed.
