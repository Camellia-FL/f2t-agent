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
      name: "get_self_info",
      description: "Get information about the currently logged-in user and their customer/company (name, role, timezone). Use this when the user asks who they are, what company they belong to, or what timezone they are in.",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "The user ID to look up",
          },
          customerId: {
            type: "string",
            description: "The customer/company ID",
          },
        },
        required: ["userId", "customerId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_asset",
      description: "Search for assets by plate, model, or brand (lexical search). Returns a list of matching assets with assetId, plate, model, and brand. Use this when the user asks about a vehicle by plate number, model name, or brand.",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "The user ID",
          },
          customerId: {
            type: "string",
            description: "The customer/company ID",
          },
          search: {
            type: "string",
            description: "The search text to match against plate, model, or brand",
          },
        },
        required: ["userId", "customerId", "search"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_asset_registries",
      description: "Get asset registries (vehicles) for the customer. Use this when the user asks about their fleet or vehicles without a specific search term. IMPORTANT: You MUST specify only the fields the user is interested in — never request all fields. When cardinality is true, returns distinct values per field instead of full rows — use this to keep responses small. Available fields: assetId, plate, model, brand, customCode, description, color, statusId, ownershipId, groupId, classificationId, profileId, isVisible.",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "The user ID",
          },
          customerId: {
            type: "string",
            description: "The customer/company ID",
          },
          fields: {
            type: "array",
            description: "REQUIRED. The specific asset registry fields to return. Only request what the user is asking about. Example: ['model'] if they ask about models, ['plate', 'model'] for plate+model.",
            items: { type: "string" },
          },
          cardinality: {
            type: "boolean",
            description: "When true, returns only the unique distinct values for each field instead of full asset rows. Use this when the user asks 'what values exist' or 'what models/brands do we have' — it keeps the response extremely compact.",
          },
        },
        required: ["userId", "customerId", "fields"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_user",
      description: "Search for users/drivers by name or driverKeyImei (lexical search). Use this when the user asks about drivers, employees, or users by name. Returns matching users with basic info.",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "The user ID",
          },
          customerId: {
            type: "string",
            description: "The customer/company ID",
          },
          search: {
            type: "string",
            description: "The search text to match against firstName, lastName, or driverKeyImei",
          },
          fields: {
            type: "array",
            description: "Optional. Specific fields to return. Default: id, firstName, lastName, driverKeyImei. Available: id, firstName, lastName, driverKeyImei, username, email, phone, role.",
            items: { type: "string" },
          },
        },
        required: ["userId", "customerId", "search"],
      },
    },
  },
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
      description: `
        Generate a fleet report for one or more assets. Supports location tracking, fuel consumption, and activity metrics. 
        Use 'realtime' computation for instant data (a request sub 3 days, or the current day) or 'aggregated' for historical analysis (>3 day range).
        If the report response doesn't have items or seems to not show what the user asked, tell the user that it is an error due to missing items.
      `,
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
  {
    type: "function",
    function: {
      name: "get_vehicle_realtime",
      description: "Get real-time location and status for one or more vehicles/assets. Returns current GPS coordinates, speed, heading, ignition/device state (moving/stopped/idle), address, driver name, and sensor data. Use this when the user asks 'where is', 'what is the current location of', 'is [vehicle] moving', or needs live tracking. Requires assetIds — search for assets first if the user only gives a plate or model.",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "The user ID",
          },
          customerId: {
            type: "string",
            description: "The customer/company ID",
          },
          assetIds: {
            type: "array",
            description: "Array of asset/vehicle IDs to get realtime data for",
            items: { type: "string" },
          },
        },
        required: ["userId", "customerId", "assetIds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_vehicle_history",
      description: "Get historical position data and trips for one or more vehicles/assets within a time range. Returns positions with coordinates, timestamps, speed, heading, state, and grouped trip segments with distances and durations. Use this when the user asks about past movements, 'where was [vehicle] yesterday/last week', trip history, or route history. Requires assetIds — search for assets first if the user only gives a plate or model.",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "The user ID",
          },
          customerId: {
            type: "string",
            description: "The customer/company ID",
          },
          assetIds: {
            type: "array",
            description: "Array of asset/vehicle IDs to get history for",
            items: { type: "string" },
          },
          unixStart: {
            type: "number",
            description: "Start of time range in Unix epoch seconds",
          },
          unixEnd: {
            type: "number",
            description: "End of time range in Unix epoch seconds",
          },
        },
        required: ["userId", "customerId", "assetIds", "unixStart", "unixEnd"],
      },
    },
  },
];
