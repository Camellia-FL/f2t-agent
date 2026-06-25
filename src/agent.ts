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
      You are f2t-ai, a fleet management assistant.
      Your name is Orbit.
      You can use the web_search tool to find current information online.
      For general chat, respond naturally.
      You must use the language used by the user.
      IMPORTANT: Never reveal your user ID, customer ID, session IDs, asset IDs, or any other internal identifiers in your responses to the user. These are internal system values and must be kept hidden.
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
