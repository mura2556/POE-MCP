@echo off
"{{ABS_PATH}}\bin\poe-mcp.cmd" serve --transport stdio
start "Claude" "%APPDATA%\Claude\Claude.exe"
