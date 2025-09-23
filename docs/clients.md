# MCP client configuration

All generated configs keep the `{{ABS_PATH}}` placeholder until you supply your own path. Before running `pnpm build:clients`, set:

```bash
export POE_MCP_CLIENTS_ABS=$(pwd)
pnpm build:clients
```

The `build:clients` script will rewrite every command entry to point at your local `bin/poe-mcp` launcher while retaining helper `.cmd` scripts on Windows.

## Claude Desktop

| Platform | Copy path | Command |
| --- | --- | --- |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` | `cp dist/clients/claude_desktop_config.json "~/Library/Application Support/Claude/claude_desktop_config.json"` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` | `copy dist\clients\claude_desktop_config.json "%APPDATA%\Claude\claude_desktop_config.json"` |
| Linux | `~/.config/Claude/claude_desktop_config.json` | `cp dist/clients/claude_desktop_config.json ~/.config/Claude/claude_desktop_config.json` |

After copying, restart Claude Desktop and verify the MCP connection from **Settings → MCP Servers**.

## Cursor (Desktop/Web IDE)

Cursor reads both a global profile and per-project override:

- Global file: `~/.cursor/mcp.json` (`%USERPROFILE%\.cursor\mcp.json` on Windows)
- Project file: `<project>/.cursor/mcp.json`

Install with:

```bash
cp dist/clients/cursor.mcp.json ~/.cursor/mcp.json
```

Launch Cursor and open **Settings → MCP** to confirm that `poe-mcp` is enabled. Run a quick test from the in-editor command palette: `poe-mcp: search_data BaseItem Amulet`.

## LM Studio (>= v0.3.17)

LM Studio accepts Cursor-style configs. For local stdio, copy `dist/clients/lmstudio.mcp.json` into:

- macOS: `~/Library/Application Support/LM Studio/mcp.json`
- Windows: `%APPDATA%\LM Studio\mcp.json`
- Linux: `~/.config/LM Studio/mcp.json`

For remote SSE mode, use `dist/clients/lmstudio.remote.mcp.json` and toggle the new **Remote MCP (beta)** panel. Ensure the HTTP server is running via `node dist/index.cjs serve --transport http --port 8765` and test with the in-app `Verify Connection` button (LM Studio expects the SSE endpoint at `http://127.0.0.1:8765/sse`).

## AnythingLLM (Desktop & Docker)

- Desktop config: copy `dist/clients/anythingllm_mcp_servers.json` to `~/Library/Application Support/anythingllm-desktop/storage/plugins/anythingllm_mcp_servers.json` (macOS) or `%APPDATA%\anythingllm-desktop\storage\plugins\anythingllm_mcp_servers.json` (Windows).
- Agents screen import: drop `dist/clients/anythingllm_agents.json` into the corresponding `storage/agents/` path.
- Docker: mount a volume at `/opt/anythingllm/storage`. If the container uses a custom `STORAGE_LOCATION`, mirror that in the target path before copying the JSON files.

From the AnythingLLM UI open **Plugins → MCP Servers** and toggle `poe-mcp` to verify auto-start.

## Open WebUI via mcpo bridge

Use the generated compose bundle `dist/clients/openwebui+mcpo.compose.yaml`:

```bash
cp dist/clients/openwebui+mcpo.compose.yaml ./docker-compose.poe-mcp.yaml
docker compose -f docker-compose.poe-mcp.yaml up -d
```

Run a health check:

```bash
curl http://localhost:3000/openapi.json | head
```

Open WebUI should now expose the `poe-mcp` tools under **Integrations → MCP**. A direct SSE config is also available at `dist/clients/openwebui.direct.yaml` for builds that ship native MCP support.

---

Additional clients (VS Code Copilot MCP, Visual Studio, Continue.dev, JetBrains, Raycast, Obsidian, Zed, Codeium/OpenRouter bridges, and generic HTML hosts) are included under `dist/clients/`. Each file contains the exact copy destinations and launch helpers in its header comments.
