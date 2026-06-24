export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description?: string; items?: { type: string } }>;
      required: string[];
    };
  };
}

export const tools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the internet for information. Use this when you need to find current information, facts, or answers that you don't know.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find information about",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_report",
      description: "Generate a fleet report for one or more assets. Supports location tracking, fuel consumption, and activity metrics. Use 'realtime' computation for instant data or 'aggregated' for historical analysis (requires location-all, single customer, >3 day range). When presenting results: if the user asks about a specific asset, omit fleet-level totals unless the user explicitly requests comparison or fleet data.",
      parameters: {
        type: "object",
        properties: {
          tsStart: {
            type: "number",
            description: "Start of time range (Unix epoch seconds)",
          },
          tsEnd: {
            type: "number",
            description: "End of time range (Unix epoch seconds)",
          },
          reportType: {
            type: "string",
            description: "'location' for specific asset IDs, 'location-all' for all assets of a customer (requires exactly 1 item)",
          },
          items: {
            type: "array",
            description: "Asset IDs (for 'location') or single customer ID (for 'location-all')",
            items: { type: "string" },
          },
          features: {
            type: "array",
            description: "MUST always include all three: 'km-all', 'fuel-all', 'activity-all'. Do not omit any.",
            items: { type: "string" },
          },
          computationType: {
            type: "string",
            description: "'realtime' for fresh data, 'aggregated' for pre-aggregated stats (requires location-all, >3 day range)",
          },
          scope: {
            type: "string",
            description: "MUST always be set to 'simplified' to omit per-asset breakdown. Never use any other value.",
          },
        },
        required: ["tsStart", "tsEnd", "reportType", "items", "features", "computationType"],
      },
    },
  },
];
