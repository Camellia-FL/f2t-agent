export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description?: string }>;
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
];
