# f2t-agent

Fleet management AI assistant ("Orbit") powered by a local LLM via llama.cpp.

## Features

- Streaming chat via SSE
- Web search via SearXNG
- Reasoning/thinking tokens streamed separately
- Session-based conversation memory

## Prerequisites

- Node.js
- llama.cpp server with `--jinja` flag (for tool calling + Qwen3)
- SearXNG instance (for web search)

## Setup

```bash
npm install
npm run build
```

## Running

```bash
# Terminal 1: llama.cpp
llama-server --jinja -fa -m <model.gguf>

# Terminal 2: agent
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Express server port |
| `LLAMA_BASE_URL` | `http://127.0.0.1:8080` | llama.cpp server URL |
| `LLAMA_N_PREDICT` | `16384` | Max tokens to generate |
| `AGENT_MAX_MEMORY` | `20` | Max messages per session |
| `SEARXNG_URL` | `http://localhost:8888` | SearXNG instance URL |

## Testing

```bash
node test-client.mjs
```

## API

### `POST /api/agent/chat`

SSE stream with events: `session`, `token`, `tool_call`, `tool_result`, `done`, `error`.

```json
{ "message": "search for latest news about tesla", "sessionId": "optional" }
```

### `POST /api/agent/session/clear`

```json
{ "sessionId": "..." }
```
