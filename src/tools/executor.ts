import { webSearch } from "./search";

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  tool: string;
  result: unknown;
  error?: string;
}

export async function executeTool(call: ToolCall): Promise<ToolResult> {
  try {
    switch (call.name) {
      case "web_search": {
        const query = call.arguments.query as string;
        if (!query) return { tool: call.name, result: null, error: "Missing required argument: query" };
        const results = await webSearch(query);
        return { tool: call.name, result: results };
      }
      default:
        return { tool: call.name, result: null, error: `Unknown tool: ${call.name}` };
    }
  } catch (err) {
    return {
      tool: call.name,
      result: null,
      error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
