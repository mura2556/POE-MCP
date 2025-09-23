# Quick Start

Follow this end-to-end walk-through to install the PoE MCP server, rebuild the PoE1 dataset, and wire it into popular MCP clients.

## 1. Install the CLI
Choose the distribution that matches your environment:

### npm (Node.js 18+)
```bash
npm install -g poe-mcp
poe-mcp serve --transport http --metrics --health --port 8765
```

### Docker (HTTP transport exposed on 8765)
```bash
docker run --rm -p 8765:8765 ghcr.io/<OWNER>/poe-mcp:latest
```

### Offline release bundle
Download the latest GitHub Release, extract `poe-mcp-offline-data.zip`, and run:
```bash
poe-mcp offline --from ./poe-mcp-offline-data --transport http --port 8765
```

## 2. Rebuild data (optional)
To regenerate the dataset locally, run:
```bash
pnpm install
pnpm build
pnpm etl:all
pnpm data:validate
```
This writes dated snapshots under `data/<YYYY-MM-DD>/` and updates the `data/latest` symlink.

## 3. Configure clients
### Claude Desktop (macOS)
Copy `dist/clients/claude_desktop_config.json` to:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```
Windows users copy it to `%APPDATA%\Claude\claude_desktop_config.json`.

### Cursor (global + workspace)
Global configuration:
```
cp dist/clients/cursor.mcp.json ~/.cursor/mcp.json
```
Workspace override (from project root):
```
cp dist/clients/cursor.mcp.json ./.cursor/mcp.json
```

### LM Studio ≥ 0.3.17
LM Studio reads the Cursor-style schema:
```
cp dist/clients/lmstudio.mcp.json "~/Library/Application Support/LM Studio/mcp.json"
```
For remote SSE usage point LM Studio at `http://127.0.0.1:8765/sse` using `dist/clients/lmstudio.remote.mcp.json`.

### AnythingLLM Desktop or Docker
Desktop:
```
cp dist/clients/anythingllm_mcp_servers.json "~/Library/Application Support/anythingllm-desktop/storage/plugins/anythingllm_mcp_servers.json"
```
Docker host path: `/opt/anythingllm/storage/plugins/anythingllm_mcp_servers.json`.

### Open WebUI via MCPO
Follow [docs/openwebui.md](./openwebui.md) to launch the docker-compose stack and connect the generated OpenAPI endpoint.

## 4. First tool calls
Assuming the server runs on `http://127.0.0.1:8765`:

```bash
# List key schema fields
curl -s http://127.0.0.1:8765/rpc \
  -H 'Content-Type: application/json' \
  -d '{"id":1,"method":"get_schema","params":{"kind":"baseItem"}}'

# Parse a sample item text fixture
curl -s http://127.0.0.1:8765/rpc \
  -H 'Content-Type: application/json' \
  -d @fixtures/items/item_1.txt

# Decode a Path of Building code
node - <<'NODE'
import fetch from 'node-fetch';
const payload = { id: 2, method: 'pob_decode', params: { code: (await import('fs/promises')).readFile('fixtures/pob/build_1.txt', 'utf-8') } };
const res = await fetch('http://127.0.0.1:8765/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
console.log(await res.json());
NODE
```

## 5. Crafting lookup example
```bash
curl -s http://127.0.0.1:8765/rpc \
  -H 'Content-Type: application/json' \
  -d '{"id":3,"method":"crafting_lookup","params":{"base_id":"example-base","desired_mods":["+1 to Level of Socketed Gems"]}}'
```
The response groups strategies (`cheapest`, `fastest`, `safest`) with prerequisite notes and fix/unwanted branches.

With the clients pointed to the MCP server and initial tool calls verified, you are ready to embed PoE knowledge into your workflows.
