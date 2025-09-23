# Open WebUI + MCPO Bridge

This guide runs the PoE MCP server behind the [`mcpo`](https://github.com/modelcontextprotocol/mcpo) bridge so Open WebUI can consume a JSON-RPC server as OpenAPI.

## Prerequisites
- Docker and docker compose
- A built PoE MCP binary at `{{ABS_PATH}}/bin/poe-mcp` (generated via `pnpm build && pnpm build:bin`)

## Steps
1. Export your absolute project path so the compose file can substitute it:
   ```bash
   export ABS_PATH=$(pwd)
   ```
2. Bring up the stack:
   ```bash
   docker compose -f dist/clients/openwebui+mcpo.compose.yaml up -d
   ```
3. Confirm the bridge is healthy and the OpenAPI descriptor is reachable:
   ```bash
   curl http://127.0.0.1:3000/openapi.json | jq '.info.title'
   ```
4. Open `http://127.0.0.1:3000` in your browser and finish the Open WebUI onboarding.
5. In Open WebUI → *Settings → MCP Servers*, add a new server using the generated OpenAPI URL `http://poe-mcp:3000/openapi.json`.

## Healthchecks
- The `poe-mcp` service checks `http://127.0.0.1:3000/openapi.json` inside the bridge container.
- The `openwebui` service checks `http://127.0.0.1:8080/health` to ensure the UI is ready.

Stop the stack with:
```bash
docker compose -f dist/clients/openwebui+mcpo.compose.yaml down
```
