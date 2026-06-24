import { webSearch } from "./search";
import { createReport } from "./report";

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
      case "create_report": {
        const { tsStart, tsEnd, reportType, items, features, computationType, scope } = call.arguments as any;
        if (!tsStart || !tsEnd || !reportType || !items || !features || !computationType) {
          return { tool: call.name, result: null, error: "Missing required arguments" };
        }
        const result = await createReport({
          tsStart: Number(tsStart),
          tsEnd: Number(tsEnd),
          reportType: reportType as any,
          items: items as string[],
          features: ["km-all", "fuel-all", "activity-all"],
          computationType: computationType as any,
          scope: "simplified",
        });
        return { tool: call.name, result };
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
