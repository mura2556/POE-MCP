import fs from 'node:fs/promises';
import path from 'node:path';

interface ClientConfig {
  name: string;
  file: string;
  content: string;
  description: string;
  osPaths: { windows: string; mac: string; linux: string };
  copyCommand: { windows: string; mac: string; linux: string };
  windowsLaunch?: string;
  extraFiles?: Array<{ file: string; content: string }>;
}

const binPlaceholder = '{{ABS_PATH}}/bin/poe-mcp';
const projectRoot = process.env.POE_MCP_CLIENTS_ABS ?? path.resolve('.');
const binPosix = path.join(projectRoot, 'bin', 'poe-mcp').split(path.sep).join('/');
const binWindowsCmd = path.join(projectRoot, 'bin', 'poe-mcp.cmd').split(path.sep).join('\\');

function substituteContent(content: string, target: string): string {
  if (target.endsWith('.cmd')) {
    return content.replaceAll(binPlaceholder, binWindowsCmd);
  }
  if (target.endsWith('.sh')) {
    return content.replaceAll(binPlaceholder, binPosix);
  }
  return content.replaceAll(binPlaceholder, binPosix);
}

const clients: ClientConfig[] = [
  {
    name: 'Claude Desktop',
    file: 'claude_desktop_config.json',
    content: JSON.stringify({
      mcpServers: {
        'poe-mcp': {
          command: `${binPlaceholder}`,
          args: ['serve', '--transport', 'stdio'],
          enabled: true,
        },
      },
    }, null, 2),
    description: 'Place alongside existing Claude Desktop config to enable PoE MCP server.',
    osPaths: {
      windows: '%APPDATA%/Claude/claude_desktop_config.json',
      mac: '~/Library/Application Support/Claude/claude_desktop_config.json',
      linux: '~/.config/Claude/claude_desktop_config.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\claude_desktop_config.json "%APPDATA%\\Claude\\claude_desktop_config.json"',
      mac: 'cp dist/clients/claude_desktop_config.json "~/Library/Application Support/Claude/claude_desktop_config.json"',
      linux: 'cp dist/clients/claude_desktop_config.json ~/.config/Claude/claude_desktop_config.json',
    },
    windowsLaunch: 'start "Claude" "%APPDATA%\\Claude\\Claude.exe"',
  },
  {
    name: 'Claude Web Connector',
    file: 'claude_web_connector.json',
    content: JSON.stringify({
      name: 'poe-mcp',
      command: `${binPlaceholder}`,
      args: ['serve', '--transport', 'stdio'],
    }, null, 2),
    description: 'Import via Claude.ai custom connector settings.',
    osPaths: {
      windows: 'Upload via Claude.ai settings',
      mac: 'Upload via Claude.ai settings',
      linux: 'Upload via Claude.ai settings',
    },
    copyCommand: {
      windows: 'N/A',
      mac: 'N/A',
      linux: 'N/A',
    },
  },
  {
    name: 'Cursor',
    file: 'cursor.mcp.json',
    content: JSON.stringify({
      mcpServers: [
        { name: 'poe-mcp', command: `${binPlaceholder}`, args: ['serve', '--transport', 'stdio'] },
      ],
    }, null, 2),
    description: 'Supports both global ~/.cursor/mcp.json and project overrides.',
    osPaths: {
      windows: '%USERPROFILE%/.cursor/mcp.json',
      mac: '~/.cursor/mcp.json',
      linux: '~/.cursor/mcp.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\cursor.mcp.json %USERPROFILE%\\.cursor\\mcp.json',
      mac: 'cp dist/clients/cursor.mcp.json ~/.cursor/mcp.json',
      linux: 'cp dist/clients/cursor.mcp.json ~/.cursor/mcp.json',
    },
    windowsLaunch: 'start "Cursor" "%LOCALAPPDATA%\\Programs\\Cursor\\Cursor.exe"',
  },
  {
    name: 'LM Studio (local stdio)',
    file: 'lmstudio.mcp.json',
    content: JSON.stringify({
      mcpServers: [
        { name: 'poe-mcp', command: `${binPlaceholder}`, args: ['serve', '--transport', 'stdio'] },
      ],
    }, null, 2),
    description: 'Drop into LM Studio support folder.',
    osPaths: {
      windows: '%APPDATA%/LM Studio/mcp.json',
      mac: '~/Library/Application Support/LM Studio/mcp.json',
      linux: '~/.config/LM Studio/mcp.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\lmstudio.mcp.json "%APPDATA%\\LM Studio\\mcp.json"',
      mac: 'cp dist/clients/lmstudio.mcp.json "~/Library/Application Support/LM Studio/mcp.json"',
      linux: 'cp dist/clients/lmstudio.mcp.json "~/.config/LM Studio/mcp.json"',
    },
  },
  {
    name: 'AnythingLLM Desktop',
    file: 'anythingllm_mcp_servers.json',
    content: JSON.stringify({
      'poe-mcp': {
        command: `${binPlaceholder}`,
        args: ['serve', '--transport', 'stdio'],
        autoStart: true,
      },
    }, null, 2),
    description: 'Copy into AnythingLLM desktop storage plugins directory.',
    osPaths: {
      windows: '%APPDATA%/anythingllm-desktop/storage/plugins/anythingllm_mcp_servers.json',
      mac: '~/Library/Application Support/anythingllm-desktop/storage/plugins/anythingllm_mcp_servers.json',
      linux: '~/.config/anythingllm/storage/plugins/anythingllm_mcp_servers.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\anythingllm_mcp_servers.json "%APPDATA%\\anythingllm-desktop\\storage\\plugins\\anythingllm_mcp_servers.json"',
      mac: 'cp dist/clients/anythingllm_mcp_servers.json "~/Library/Application Support/anythingllm-desktop/storage/plugins/anythingllm_mcp_servers.json"',
      linux: 'cp dist/clients/anythingllm_mcp_servers.json ~/.config/anythingllm/storage/plugins/anythingllm_mcp_servers.json',
    },
  },
  {
    name: 'Open WebUI via mcpo',
    file: 'openwebui.mcpo.yaml',
    content: `version: "3"
services:
  mcpo:
    image: ghcr.io/modelcontextprotocol/mcpo:latest
    command: ["--binary", "${binPlaceholder}", "serve", "--transport", "stdio"]
    volumes:
      - ${binPlaceholder}:/app/poe-mcp
  webui:
    image: ghcr.io/open-webui/open-webui:latest
    environment:
      MCP_ENABLED: "true"
      MCP_SERVER_URL: "http://mcpo:3000/openapi.json"
    ports:
      - "3000:8080"`,
    description: 'Docker compose bridging mcpo to Open WebUI.',
    osPaths: {
      windows: 'Project docker-compose location',
      mac: 'Project docker-compose location',
      linux: 'Project docker-compose location',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\openwebui.mcpo.yaml .\\docker-compose.mcpo.yaml',
      mac: 'cp dist/clients/openwebui.mcpo.yaml ./docker-compose.mcpo.yaml',
      linux: 'cp dist/clients/openwebui.mcpo.yaml ./docker-compose.mcpo.yaml',
    },
  },
  {
    name: 'VS Code MCP',
    file: 'vscode.mcp.json',
    content: JSON.stringify({
      mcpServers: {
        poe: {
          command: `${binPlaceholder}`,
          args: ['serve', '--transport', 'stdio'],
          env: {},
        },
      },
      tools: {
        poe: ['search_data', 'item_parse', 'crafting_lookup', 'economy_snapshot'],
      },
    }, null, 2),
    description: 'Compatible with GitHub Copilot MCP developer preview.',
    osPaths: {
      windows: '%APPDATA%/Code/User/globalStorage/github.copilot/chat/mcp.json',
      mac: '~/Library/Application Support/Code/User/globalStorage/github.copilot/chat/mcp.json',
      linux: '~/.config/Code/User/globalStorage/github.copilot/chat/mcp.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\vscode.mcp.json "%APPDATA%\\Code\\User\\globalStorage\\github.copilot\\chat\\mcp.json"',
      mac: 'cp dist/clients/vscode.mcp.json "~/Library/Application Support/Code/User/globalStorage/github.copilot/chat/mcp.json"',
      linux: 'cp dist/clients/vscode.mcp.json ~/.config/Code/User/globalStorage/github.copilot/chat/mcp.json',
    },
  },
  {
    name: 'Visual Studio',
    file: 'visualstudio.mcp.json',
    content: JSON.stringify({
      servers: [
        { name: 'poe-mcp', command: `${binPlaceholder}`, args: ['serve', '--transport', 'stdio'] },
      ],
    }, null, 2),
    description: 'Place into %USERPROFILE%/.mcp.json or alongside .sln.',
    osPaths: {
      windows: '%USERPROFILE%/.mcp.json',
      mac: '~/.mcp.json',
      linux: '~/.mcp.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\visualstudio.mcp.json %USERPROFILE%\\.mcp.json',
      mac: 'cp dist/clients/visualstudio.mcp.json ~/.mcp.json',
      linux: 'cp dist/clients/visualstudio.mcp.json ~/.mcp.json',
    },
  },
  {
    name: 'Continue.dev',
    file: 'continue.mcp.yaml',
    content: `mcpServers:
  - name: poe-mcp-stdio
    command: ${binPlaceholder}
    args: ["serve", "--transport", "stdio"]
  - name: poe-mcp-http
    url: http://127.0.0.1:8765/rpc`,
    description: 'Works for VS Code and JetBrains Continue clients.',
    osPaths: {
      windows: '%APPDATA%/Continue/config.yaml',
      mac: '~/Library/Application Support/Continue/config.yaml',
      linux: '~/.config/Continue/config.yaml',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\continue.mcp.yaml "%APPDATA%\\Continue\\config.yaml"',
      mac: 'cp dist/clients/continue.mcp.yaml "~/Library/Application Support/Continue/config.yaml"',
      linux: 'cp dist/clients/continue.mcp.yaml ~/.config/Continue/config.yaml',
    },
  },
  {
    name: 'Claude Desktop Extension Bundle',
    file: 'claude-desktop-extension/manifest.json',
    content: JSON.stringify({
      name: 'poe-mcp-extension',
      version: '1.0.0',
      description: 'Launches poe-mcp with stdio transport for Claude Desktop.',
      entry: 'launch.sh',
    }, null, 2),
    description: 'Zip the folder and import as a local Claude Desktop extension.',
    osPaths: {
      windows: 'Use Claude Desktop extension manager',
      mac: 'Use Claude Desktop extension manager',
      linux: 'Use Claude Desktop extension manager',
    },
    copyCommand: {
      windows: 'tar -a -c -f claude-poe-mcp.zip -C dist/clients/claude-desktop-extension .',
      mac: 'cd dist/clients/claude-desktop-extension && zip -r ../claude-poe-mcp.zip .',
      linux: 'cd dist/clients/claude-desktop-extension && zip -r ../claude-poe-mcp.zip .',
    },
    extraFiles: [
      {
        file: 'claude-desktop-extension/launch.sh',
        content: `#!/bin/sh
"${binPlaceholder}" serve --transport stdio`,
      },
      {
        file: 'claude-desktop-extension/README.md',
        content: '# Claude Desktop Extension\nInstall via Claude settings > Extensions and point to this folder.',
      },
    ],
  },
  {
    name: 'JetBrains IDEs',
    file: 'jetbrains.continue.mcp.yaml',
    content: `mcpServers:
  - name: poe-mcp
    command: ${binPlaceholder}
    args: ["serve", "--transport", "stdio"]`,
    description: 'Use with Continue plugin inside JetBrains IDEs.',
    osPaths: {
      windows: '%APPDATA%/Continue/config.yaml',
      mac: '~/Library/Application Support/Continue/config.yaml',
      linux: '~/.config/Continue/config.yaml',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\jetbrains.continue.mcp.yaml "%APPDATA%\\Continue\\config.yaml"',
      mac: 'cp dist/clients/jetbrains.continue.mcp.yaml "~/Library/Application Support/Continue/config.yaml"',
      linux: 'cp dist/clients/jetbrains.continue.mcp.yaml ~/.config/Continue/config.yaml',
    },
  },
  {
    name: 'OpenRouter IDE Bridge',
    file: 'openrouter.mcp.json',
    content: JSON.stringify({
      mcpServers: [
        { name: 'poe-mcp', command: `${binPlaceholder}`, args: ['serve', '--transport', 'stdio'] },
      ],
    }, null, 2),
    description: 'For IDEs compatible with Cursor schema via OpenRouter bridges.',
    osPaths: {
      windows: '%USERPROFILE%/.openrouter/mcp.json',
      mac: '~/.openrouter/mcp.json',
      linux: '~/.openrouter/mcp.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\openrouter.mcp.json %USERPROFILE%\\.openrouter\\mcp.json',
      mac: 'cp dist/clients/openrouter.mcp.json ~/.openrouter/mcp.json',
      linux: 'cp dist/clients/openrouter.mcp.json ~/.openrouter/mcp.json',
    },
  },
  {
    name: 'LM Studio Remote SSE',
    file: 'lmstudio.remote.mcp.json',
    content: JSON.stringify({
      mcpServers: [
        { name: 'poe-mcp-remote', url: 'http://127.0.0.1:8765/rpc', transport: 'sse' },
      ],
    }, null, 2),
    description: 'Configure LM Studio remote host to connect via SSE.',
    osPaths: {
      windows: '%APPDATA%/LM Studio/mcp.remote.json',
      mac: '~/Library/Application Support/LM Studio/mcp.remote.json',
      linux: '~/.config/LM Studio/mcp.remote.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\lmstudio.remote.mcp.json "%APPDATA%\\LM Studio\\mcp.remote.json"',
      mac: 'cp dist/clients/lmstudio.remote.mcp.json "~/Library/Application Support/LM Studio/mcp.remote.json"',
      linux: 'cp dist/clients/lmstudio.remote.mcp.json ~/.config/LM\ Studio/mcp.remote.json',
    },
  },
  {
    name: 'Raycast',
    file: 'raycast.mcp.json',
    content: JSON.stringify({
      hosts: [
        {
          name: 'poe-mcp',
          command: `${binPlaceholder}`,
          args: ['serve', '--transport', 'stdio'],
        },
      ],
    }, null, 2),
    description: 'Bridge configuration for Raycast MCP host.',
    osPaths: {
      windows: '%APPDATA%/Raycast/mcp.json',
      mac: '~/Library/Application Support/Raycast/mcp.json',
      linux: '~/.config/Raycast/mcp.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\raycast.mcp.json "%APPDATA%\\Raycast\\mcp.json"',
      mac: 'cp dist/clients/raycast.mcp.json "~/Library/Application Support/Raycast/mcp.json"',
      linux: 'cp dist/clients/raycast.mcp.json ~/.config/Raycast/mcp.json',
    },
  },
  {
    name: 'AnythingLLM Agents Page',
    file: 'anythingllm_agents.json',
    content: JSON.stringify({
      agents: [
        {
          name: 'poe-mcp',
          command: `${binPlaceholder}`,
          args: ['serve', '--transport', 'stdio'],
          autoStart: true,
        },
      ],
    }, null, 2),
    description: 'Import via Agents > MCP connectors inside AnythingLLM.',
    osPaths: {
      windows: '%APPDATA%/anythingllm-desktop/storage/agents/anythingllm_agents.json',
      mac: '~/Library/Application Support/anythingllm-desktop/storage/agents/anythingllm_agents.json',
      linux: '~/.config/anythingllm/storage/agents/anythingllm_agents.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\anythingllm_agents.json "%APPDATA%\\anythingllm-desktop\\storage\\agents\\anythingllm_agents.json"',
      mac: 'cp dist/clients/anythingllm_agents.json "~/Library/Application Support/anythingllm-desktop/storage/agents/anythingllm_agents.json"',
      linux: 'cp dist/clients/anythingllm_agents.json ~/.config/anythingllm/storage/agents/anythingllm_agents.json',
    },
  },
  {
    name: 'Obsidian MCP Plugin Template',
    file: 'obsidian-mcp-plugin/manifest.json',
    content: JSON.stringify({
      id: 'poe-mcp-plugin',
      name: 'PoE MCP Plugin',
      version: '0.0.1',
      description: 'Connects to poe-mcp using Cursor-style config.',
      main: 'main.js',
    }, null, 2),
    description: 'Copy folder into Obsidian plugins, update config to point to cursor.mcp.json.',
    osPaths: {
      windows: '%APPDATA%/Obsidian/Community Plugins/poe-mcp-plugin/',
      mac: '~/Library/Application Support/obsidian/Community Plugins/poe-mcp-plugin/',
      linux: '~/.config/obsidian/Community Plugins/poe-mcp-plugin/',
    },
    copyCommand: {
      windows: 'xcopy /E /I dist\\clients\\obsidian-mcp-plugin "%APPDATA%\\Obsidian\\Community Plugins\\poe-mcp-plugin"',
      mac: 'cp -R dist/clients/obsidian-mcp-plugin "~/Library/Application Support/obsidian/Community Plugins/poe-mcp-plugin"',
      linux: 'cp -R dist/clients/obsidian-mcp-plugin ~/.config/obsidian/Community\ Plugins/poe-mcp-plugin',
    },
    extraFiles: [
      {
        file: 'obsidian-mcp-plugin/main.js',
        content: `module.exports = class PoeMcpPlugin {
  onload() {
    console.log('PoE MCP plugin loaded. Copy cursor.mcp.json into this vault to configure.');
  }
};`,
      },
      {
        file: 'obsidian-mcp-plugin/README.md',
        content: `# Obsidian PoE MCP Plugin\nDrop this folder into your vault's .obsidian/plugins directory.`,
      },
    ],
  },
  {
    name: 'Zed IDE',
    file: 'zed.mcp.json',
    content: JSON.stringify({
      mcpServers: [
        { name: 'poe-mcp', command: `${binPlaceholder}`, args: ['serve', '--transport', 'stdio'], enabled: true },
      ],
      experimental: { enabled: true },
    }, null, 2),
    description: 'Feature-flagged config for Zed experimental MCP support.',
    osPaths: {
      windows: '%APPDATA%/Zed/settings/mcp.json',
      mac: '~/Library/Application Support/Zed/settings/mcp.json',
      linux: '~/.config/Zed/settings/mcp.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\zed.mcp.json "%APPDATA%\\Zed\\settings\\mcp.json"',
      mac: 'cp dist/clients/zed.mcp.json "~/Library/Application Support/Zed/settings/mcp.json"',
      linux: 'cp dist/clients/zed.mcp.json ~/.config/Zed/settings/mcp.json',
    },
  },
  {
    name: 'Codeium / Sourcegraph Agents',
    file: 'codeium.mcp.json',
    content: JSON.stringify({
      mcpServers: [
        { name: 'poe-mcp', command: `${binPlaceholder}`, args: ['serve', '--transport', 'stdio'] },
      ],
      notes: 'Enable MCP bridge via Codeium Labs or Sourcegraph Orion.',
    }, null, 2),
    description: 'Used by MCP-aware forks of Codeium or Sourcegraph agents.',
    osPaths: {
      windows: '%APPDATA%/Codeium/mcp.json',
      mac: '~/Library/Application Support/Codeium/mcp.json',
      linux: '~/.config/Codeium/mcp.json',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\codeium.mcp.json "%APPDATA%\\Codeium\\mcp.json"',
      mac: 'cp dist/clients/codeium.mcp.json "~/Library/Application Support/Codeium/mcp.json"',
      linux: 'cp dist/clients/codeium.mcp.json ~/.config/Codeium/mcp.json',
    },
  },
  {
    name: 'Open WebUI Direct SSE',
    file: 'openwebui.direct.yaml',
    content: `mcp:
  servers:
    poe-mcp:
      transport: sse
      url: http://127.0.0.1:8765/rpc`,
    description: 'Configure Open WebUI when SSE support is available.',
    osPaths: {
      windows: '%APPDATA%/open-webui/mcp.yaml',
      mac: '~/.config/open-webui/mcp.yaml',
      linux: '~/.config/open-webui/mcp.yaml',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\openwebui.direct.yaml "%APPDATA%\\open-webui\\mcp.yaml"',
      mac: 'cp dist/clients/openwebui.direct.yaml ~/.config/open-webui/mcp.yaml',
      linux: 'cp dist/clients/openwebui.direct.yaml ~/.config/open-webui/mcp.yaml',
    },
  },
  {
    name: 'Generic Web MCP Host',
    file: 'generic-web-host.html',
    content: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>PoE MCP Web Host</title>
    <script type="module">
      async function call(method, params) {
        const response = await fetch('http://127.0.0.1:8765/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: Date.now(), method, params }),
        });
        const json = await response.json();
        document.getElementById('output').textContent = JSON.stringify(json, null, 2);
      }
      window.callTool = call;
    </script>
  </head>
  <body>
    <h1>PoE MCP Host</h1>
    <button onclick="callTool('verify_coverage', {})">Verify Coverage</button>
    <pre id="output"></pre>
  </body>
</html>`,
    description: 'Minimal HTML harness to test SSE/HTTP RPC.',
    osPaths: {
      windows: 'Any static hosting directory',
      mac: 'Any static hosting directory',
      linux: 'Any static hosting directory',
    },
    copyCommand: {
      windows: 'copy dist\\clients\\generic-web-host.html .',
      mac: 'cp dist/clients/generic-web-host.html .',
      linux: 'cp dist/clients/generic-web-host.html .',
    },
  },
];

async function writeClient(config: ClientConfig, baseDir: string) {
  const target = path.join(baseDir, config.file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, substituteContent(config.content, target));
  if (config.extraFiles) {
    for (const extra of config.extraFiles) {
      const extraTarget = path.join(baseDir, extra.file);
      await fs.mkdir(path.dirname(extraTarget), { recursive: true });
      await fs.writeFile(extraTarget, substituteContent(extra.content, extraTarget));
    }
  }
  if (config.windowsLaunch) {
    const cmdName = `${path.basename(config.file).replace(/\W+/g, '_')}.cmd`;
    const cmdPath = path.join(baseDir, 'windows', cmdName);
    await fs.mkdir(path.dirname(cmdPath), { recursive: true });
    const scriptLines = [
      '@echo off',
      `"${binPlaceholder}" serve --transport stdio`,
      config.windowsLaunch ?? '',
    ].filter(Boolean);
    const scriptBody = scriptLines.join('\r\n').concat('\r\n');
    await fs.writeFile(cmdPath, substituteContent(scriptBody, cmdPath));
  }
}

async function buildDocs(baseDir: string) {
  const lines: string[] = ['# MCP client configuration', '', '| Client | Windows path | macOS path | Linux path | Copy command |', '| --- | --- | --- | --- | --- |'];
  for (const client of clients) {
    lines.push(
      `| ${client.name} | ${client.osPaths.windows} | ${client.osPaths.mac} | ${client.osPaths.linux} | ${client.copyCommand.mac.replace(/\|/g, '\\|')} |`
    );
  }
  await fs.writeFile(path.join(baseDir, '..', '..', 'docs', 'clients.md'), lines.join('\n'));
}

async function main() {
  const baseDir = path.resolve('dist/clients');
  await fs.rm(baseDir, { recursive: true, force: true });
  await fs.mkdir(baseDir, { recursive: true });
  for (const client of clients) {
    await writeClient(client, baseDir);
  }
  await buildDocs(baseDir);
  console.log('Client configs generated.');
}

await main();
