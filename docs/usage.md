# Usage Guide

This document expands on the quickstart instructions from the root `README.md` and showcases common workflows for the PoE MCP project.

## Prerequisites

- Node.js 18 or later
- npm 9 or later

Install dependencies once after cloning the repository:

```bash
npm install
```

## Managing environment variables

The server relies on a small set of environment variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `HOST` | Interface for the optional HTTP server | `127.0.0.1` |
| `PORT` | Port for the HTTP server | `3333` |
| `HTTP_ENABLED` | Toggle the HTTP server | `true` |
| `SNAPSHOT_DIR` | Location for snapshot JSON files | `src/ingest/out` |
| `INGEST_FORCE_REFRESH` | Hint for future ingestion strategies | `false` |

Create a `.env` file if you want to override any value:

```bash
cp .env.example .env
```

## Running the ingestion pipeline

The ingestion pipeline is intentionally deterministic. Each run produces a new timestamped snapshot plus a `latest.json` convenience file.

```bash
npm run ingest
```

The command prints the output path and item count on completion. Snapshots are stored in `src/ingest/out/` and immediately become available to both the MCP tools and HTTP endpoints.

## Starting the server in development mode

```bash
npm run dev
```

- Uses `tsx` to watch for file changes.
- Starts the MCP stdio server.
- Launches the HTTP API if `HTTP_ENABLED` is `true`.

Stop the server with `Ctrl+C` – the shutdown handler closes both transports gracefully.

## Building for production

```bash
npm run build
npm start
```

- `npm run build` compiles TypeScript into `dist/`.
- `npm start` executes the compiled entrypoint (`dist/server/index.js`).

## Working with MCP tools

A typical MCP client can invoke the registered tools by name. Example payloads:

### Price lookup

```json
{
  "name": "price_lookup",
  "arguments": { "name": "Divine Orb" }
}
```

### Fuzzy search

```json
{
  "name": "search_prices",
  "arguments": { "query": "orb", "limit": 3 }
}
```

### List snapshots

```json
{ "name": "list_snapshots" }
```

### Refresh the in-memory cache

```json
{ "name": "refresh_snapshot" }
```

## HTTP examples

With the HTTP server enabled you can query prices using curl:

```bash
curl http://127.0.0.1:3333/prices/divine%20orb
```

Or search for multiple results:

```bash
curl "http://127.0.0.1:3333/prices?q=orb&limit=2"
```

## Testing

```bash
npm run test
```

The Vitest suite covers ingestion, data normalization, snapshot management, and MCP tool registration, ensuring regressions are caught early.
