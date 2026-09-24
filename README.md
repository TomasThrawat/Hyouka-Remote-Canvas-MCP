# Hyouka Remote Canvas MCP

Remote editable SVG canvas exposed through MCP Streamable HTTP.

MCP endpoint: /api/mcp
Canvas endpoint: /api/canvas?session=...

No Figma account, plugin, or API key is required. The canvas is a lightweight vector editor surface intended for AI-driven design work.

Important: session state is held in the Vercel function runtime and is not durable storage.
