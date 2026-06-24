# f2t-agent

## Quick Commands

- `npm run build` - Compile TypeScript to dist/
- `npm run dev` - Start dev server with hot reload (nodemon + ts-node)
- `npm start` - Run compiled server from dist/

## Architecture

TypeScript Express app (v5) providing a streaming AI assistant for fleet management via SSE.

- `src/index.ts` - Entry point, mounts routes
- `src/agent.ts` - Core agent logic, LLM streaming, tool calling loop
- `src/decoders.ts` - SSE stream decoder for llama.cpp responses
- `src/routes/agent.ts` - HTTP endpoints for chat and session management
- `src/tools/` - Tool definitions, executor, report client, and SearXNG search client

## Prerequisites

1. **llama.cpp** running with `--jinja` flag (required for tool calling)
2. **SearXNG** instance for web search (default: `http://localhost:8888`)

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3000 | Express server port |
| `LLAMA_BASE_URL` | http://127.0.0.1:8080 | llama.cpp server URL |
| `LLAMA_N_PREDICT` | 2048 | Max tokens to generate |
| `AGENT_MAX_MEMORY` | 20 | Max messages per session |
| `SEARXNG_URL` | http://localhost:8888 | SearXNG search instance |
| `REPORT_BASE_URL` | http://localhost:8081 | Report service base URL |

## Key Quirks

- Sessions are in-memory only (Map), lost on restart
- Tool calling limited to 5 rounds max to prevent infinite loops
- Express v5 is used (not v4) - API differences may apply
- TypeScript strict mode enabled
- Uses native `fetch()` (Node 18+)

## Testing

- `node test-client.mjs` - Manual test client for SSE streaming
- No automated test suite currently
