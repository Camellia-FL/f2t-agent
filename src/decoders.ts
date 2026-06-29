export type AgentEvent =
  | { type: "session"; sessionId: string }
  | { type: "token"; content: string; reasoning: boolean }
  | { type: "tool_call"; tool: string; arguments: Record<string, unknown> }
  | { type: "tool_result"; tool: string; result: unknown; error?: string }
  | { type: "done"; sessionId: string; thinking: string; message: string }
  | { type: "error"; error: string };

interface ChunkDelta {
  content?: string;
  reasoning_content?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

interface ChunkChoice {
  index: number;
  delta: ChunkDelta;
  finish_reason: string | null;
}

interface ChunkData {
  id?: string;
  choices?: ChunkChoice[];
}

export interface DecodeResult {
  events: AgentEvent[];
  finishReason: string | null;
  toolCalls: Map<number, { id: string; name: string; arguments: string }>;
}

export class StreamDecoder {
  private lineBuffer = "";
  private fullResponse = "";
  private thinkingBuf = "";
  private messageBuf = "";
  private toolCalls = new Map<number, { id: string; name: string; arguments: string }>();

  processChunk(value: Uint8Array): DecodeResult {
    const events: AgentEvent[] = [];
    let finishReason: string | null = null;

    this.lineBuffer += new TextDecoder().decode(value, { stream: true });
    const lines = this.lineBuffer.split("\n");
    this.lineBuffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") continue;

      let chunk: ChunkData;
      try { chunk = JSON.parse(raw); } catch { continue; }

      const choice = chunk.choices?.[0];
      if (!choice) continue;
      if (choice.finish_reason) finishReason = choice.finish_reason;

      const delta = choice.delta;

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!this.toolCalls.has(tc.index)) {
            this.toolCalls.set(tc.index, { id: tc.id || "", name: "", arguments: "" });
          }
          const existing = this.toolCalls.get(tc.index)!;
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) existing.name += tc.function.name;
          if (tc.function?.arguments) existing.arguments += tc.function.arguments;
        }
      }

      if (delta.reasoning_content) {
        this.thinkingBuf += delta.reasoning_content;
        events.push({ type: "token", content: delta.reasoning_content, reasoning: true });
      }

      if (delta.content) {
        this.fullResponse += delta.content;
        this.messageBuf += delta.content;
        events.push({ type: "token", content: delta.content, reasoning: false });
      }
    }

    return { events, finishReason, toolCalls: this.toolCalls };
  }

  private parsedXmlToolCalls = false;

  private parseXmlToolCallsIfNeeded(): void {
    if (this.parsedXmlToolCalls) return;
    this.parsedXmlToolCalls = true;

    const combined = this.thinkingBuf + "\n" + this.fullResponse;
    const toolCallRe = /<tool_call>\s*<function=(\w+)>([\s\S]*?)<\/function>\s*<\/tool_call>/g;
    let match: RegExpExecArray | null;
    let index = this.toolCalls.size;

    while ((match = toolCallRe.exec(combined)) !== null) {
      const name = match[1];
      const body = match[2];
      const rawArgs: Record<string, string> = {};
      const paramRe = /<parameter=(\w+)>([\s\S]*?)<\/parameter>/g;
      let pm: RegExpExecArray | null;
      while ((pm = paramRe.exec(body)) !== null) {
        rawArgs[pm[1]] = pm[2].trim();
      }

      const parsedArgs: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(rawArgs)) {
        try {
          parsedArgs[key] = JSON.parse(val);
        } catch {
          const num = Number(val);
          parsedArgs[key] = isNaN(num) || val === "" ? val : num;
        }
      }

      if (this.toolCalls.has(index)) continue;
      this.toolCalls.set(index, { id: `xml_${Date.now()}_${index}`, name, arguments: JSON.stringify(parsedArgs) });
      index++;
    }
  }

  getResult(): { thinking: string; message: string } {
    const rawThinking = this.thinkingBuf;
    const cleanedThinking = rawThinking.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
    const message = this.messageBuf.trim() || this.fullResponse.trim();
    return { thinking: cleanedThinking || rawThinking.trim(), message };
  }

  hasToolCalls(): boolean {
    this.parseXmlToolCallsIfNeeded();
    return this.toolCalls.size > 0;
  }

  getToolCalls(): Array<{ name: string; arguments: Record<string, unknown> }> {
    this.parseXmlToolCallsIfNeeded();
    const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    for (const [, tc] of this.toolCalls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.arguments); } catch {}
      calls.push({ name: tc.name, arguments: args });
    }
    return calls;
  }
}
