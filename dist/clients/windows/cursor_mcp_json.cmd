@echo off
"{{ABS_PATH}}\bin\poe-mcp.cmd" serve --transport stdio
start "Cursor" "%LOCALAPPDATA%\Programs\Cursor\Cursor.exe"
