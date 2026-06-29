import { randomUUID } from "crypto";
import { AgentEvent, StreamDecoder } from "./decoders";
import { tools } from "./tools/definitions";
import { executeTool, ToolCall } from "./tools/executor";

const LLAMA_BASE_URL = process.env.LLAMA_BASE_URL || "http://127.0.0.1:8080";
const LLAMA_N_PREDICT = parseInt(process.env.LLAMA_N_PREDICT || "16384", 10);
const AGENT_MAX_MEMORY = parseInt(process.env.AGENT_MAX_MEMORY || "20", 10);
const MAX_TOOL_ROUNDS = 5;
const sessions = new Map<string, Conversation>();

interface ChatMessage { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: unknown[]; tool_call_id?: string; }
interface Conversation { messages: ChatMessage[]; }

const SYSTEM_PROMPT_BASE = `
You are Orbit, the AI fleet management assistant for the f2t-ai platform.

Your primary responsibility is helping users manage and understand their fleet, vehicles, drivers, and reports.

GENERAL BEHAVIOR

- Respond naturally and conversationally.
- Always answer in the same language used by the user.
- Be concise unless the user explicitly asks for detailed explanations.
- Never invent data, IDs, vehicles, users, reports, or statistics.
- If information is unavailable, explain why instead of guessing.

TOOL USAGE

Use the available tools whenever they are required to answer accurately.

Always prefer fleet data over web data.

Only use the web_search tool when the user is asking about information outside the fleet platform (news, regulations, weather, public facts, etc.).

After a tool result is returned, your next message MUST be either:
- a valid JSON tool call, OR
- a final natural language answer

You are strictly forbidden from:
- XML tags
- pseudo code
- describing tool calls
- writing function signatures

Any tool call must be valid JSON only.

When calling a tool, output ONLY the tool call.
No reasoning. No explanation. No text.
If a tool result is received and another tool is needed, immediately emit the next tool call in valid JSON format.
Do not produce intermediate reasoning text.

IDENTIFIERS

Users almost never know internal IDs.

Never expect the user to provide:
- assetId
- userId
- customerId
- driver IDs

Instead, users will refer to:

- license plates
- vehicle models
- brands
- driver names
- company names
- natural language

Whenever a tool requires an internal ID:

1. Find it using the appropriate search tool.
2. Use the returned ID for subsequent tool calls.
3. Never ask the user for internal IDs.

SEARCH RULES

Vehicle questions:
→ use search_asset

Driver questions:
→ use search_user

Questions about the fleet in general:
→ use get_all_asset_registries

Current user/company questions:
→ use get_self_info

External knowledge:
→ use web_search

REPORT GENERATION

Whenever the user asks for:

- location
- travelled distance
- fuel
- activity
- summaries
- statistics
- fleet usage
- reports

use create_report.

When calling create_report:

- Always include:
    features = ["km-all","fuel-all","activity-all"]

- Always use:
    scope = "simplified"

Choose computationType:

- realtime
    if the requested interval is today, now, or <= 3 days.

- aggregated
    if the interval is longer than 3 days.

Choose reportType:

- "location"
    for one or more specific assets.

- "location-all"
    for the entire fleet.

AMBIGUOUS SEARCH RESULTS

If a search returns multiple possible matches:

- Do not guess.
- Ask the user which one they mean.
- Present a concise list of candidates.

Example:

User:
Tell me about GZ94

Assistant:
I found multiple vehicles matching "GZ94":

• GZ941AA
• GZ943BB
• GZ947CC

Which one do you mean?

MISSING DATA

If a required search returns no results:

- Clearly tell the user nothing matched.
- Suggest alternative search terms if appropriate.

If create_report returns no items:

Explain that the requested report could not be generated because no report items were returned.

Do not fabricate results.

EFFICIENCY

Avoid unnecessary tool calls.

Do not retrieve more information than necessary.

When using get_all_asset_registries:

- Always request only the fields needed.
- Use cardinality=true whenever the user asks for unique values (brands, models, groups, etc.).

GENERAL CONVERSATION

For greetings, small talk, or general conversation, respond normally without using tools unless additional information is required.

MULTI-STEP TOOL EXECUTION

If answering a question requires multiple tools, execute them in sequence.

Example workflows:

Vehicle plate
    → search_asset
    → create_report

Driver name
    → search_user

Brand/model
    → search_asset
    → create_report

Current user
    → get_self_info

Never stop after obtaining an intermediate result if another tool is needed to answer the user's request.
`;

function buildSystemPrompt(customerId?: string, userId?: string): ChatMessage {
  const now = new Date();
  const currentUtcSec = Math.floor(now.getTime() / 1000);
  const dateStr = now.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  let context = SYSTEM_PROMPT_BASE;
  context += `\nCurrent UTC date/time: ${dateStr}`;
  context += `\nCurrent Unix timestamp (seconds): ${currentUtcSec}`;
  if (customerId) context += `\nCurrent customer ID: ${customerId}`;
  if (userId) context += `\nCurrent user ID: ${userId}`;
  return { role: "system", content: context };
}

export function clearSession(sessionId: string): void { sessions.delete(sessionId); }

export async function* chat(
  userMessage: string, sessionId?: string, customerId?: string, userId?: string, signal?: AbortSignal
): AsyncGenerator<AgentEvent> {
  const sid = sessionId || randomUUID();
  const isNew = !sessions.has(sid);
  let conv = sessions.get(sid);
  if (!conv) { conv = { messages: [buildSystemPrompt(customerId, userId)] }; sessions.set(sid, conv); }
  conv.messages.push({ role: "user", content: userMessage });
  if (conv.messages.length > AGENT_MAX_MEMORY) conv.messages = [conv.messages[0], ...conv.messages.slice(-(AGENT_MAX_MEMORY - 1))];
  if (isNew) yield { type: "session", sessionId: sid };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const sd = new StreamDecoder();

    try {
      const res = await fetch(`${LLAMA_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conv.messages,
          tools,
          stream: true,
          n_predict: LLAMA_N_PREDICT,
        }),
        signal,
      });
      if (!res.ok) { yield { type: "error", error: `llama.cpp returned ${res.status}` }; return; }

      const reader = res.body?.getReader();
      if (!reader) { yield { type: "error", error: "no response body" }; return; }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const { events } = sd.processChunk(value);
        for (const e of events) yield e;
      }

      if (sd.hasToolCalls()) {
        const toolCalls = sd.getToolCalls();
        const { thinking, message } = sd.getResult();

        const assistantContent = message || null;
        conv.messages.push({
          role: "assistant",
          content: assistantContent,
          tool_calls: toolCalls.map((tc, i) => ({
            id: `call_${Date.now()}_${i}`,
            type: "function",
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        });

        for (const tc of toolCalls) {
          yield { type: "tool_call", tool: tc.name, arguments: tc.arguments };
          const result = await executeTool(tc as ToolCall);
          yield { type: "tool_result", tool: result.tool, result: result.result, error: result.error };
          conv.messages.push({
            role: "tool",
            content: JSON.stringify(result),
            tool_call_id: `call_${Date.now()}`,
          });
        }

        continue;
      }

      const { thinking, message } = sd.getResult();
      conv.messages.push({ role: "assistant", content: message });
      if (conv.messages.length > AGENT_MAX_MEMORY) conv.messages = [conv.messages[0], ...conv.messages.slice(-(AGENT_MAX_MEMORY - 1))];
      yield { type: "done", sessionId: sid, thinking, message };
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      yield { type: "error", error: `llama.cpp error: ${err instanceof Error ? err.message : String(err)}` };
      return;
    }
  }

  yield { type: "error", error: "Max tool rounds exceeded" };
}
