import { webSearch } from "./search";
import { createReport } from "./report";
import { getSelfInfo, searchAsset, getAllAssetRegistries, searchUser, getVehicleRealtime, getVehicleHistory } from "./api";

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
      case "get_self_info": {
        const userId = call.arguments.userId as string;
        const customerId = call.arguments.customerId as string;
        if (!userId || !customerId) {
          return { tool: call.name, result: null, error: "Missing required arguments: userId, customerId" };
        }
        const result = await getSelfInfo(userId, customerId);
        return { tool: call.name, result };
      }
      case "search_asset": {
        const userId2 = call.arguments.userId as string;
        const customerId2 = call.arguments.customerId as string;
        const search = call.arguments.search as string;
        if (!userId2 || !customerId2 || !search) {
          return { tool: call.name, result: null, error: "Missing required arguments: userId, customerId, search" };
        }
        const assets = await searchAsset(userId2, customerId2, search);
        return { tool: call.name, result: assets };
      }
      case "get_all_asset_registries": {
        const userId3 = call.arguments.userId as string;
        const customerId3 = call.arguments.customerId as string;
        const fields = call.arguments.fields as string[];
        const cardinality = call.arguments.cardinality as boolean | undefined;
        if (!userId3 || !customerId3 || !fields) {
          return { tool: call.name, result: null, error: "Missing required arguments: userId, customerId, fields" };
        }
        const registries = await getAllAssetRegistries(userId3, customerId3, fields, cardinality);
        return { tool: call.name, result: registries };
      }
      case "search_user": {
        const userId4 = call.arguments.userId as string;
        const customerId4 = call.arguments.customerId as string;
        const searchText = call.arguments.search as string;
        const userFields = call.arguments.fields as string[] | undefined;
        if (!userId4 || !customerId4 || !searchText) {
          return { tool: call.name, result: null, error: "Missing required arguments: userId, customerId, search" };
        }
        const users = await searchUser(userId4, customerId4, searchText, userFields);
        return { tool: call.name, result: users };
      }
      case "get_vehicle_realtime": {
        const userId5 = call.arguments.userId as string;
        const customerId5 = call.arguments.customerId as string;
        const assetIds = call.arguments.assetIds as string[];
        if (!userId5 || !customerId5 || !assetIds?.length) {
          return { tool: call.name, result: null, error: "Missing required arguments: userId, customerId, assetIds" };
        }
        const realtime = await getVehicleRealtime(userId5, customerId5, assetIds);
        return { tool: call.name, result: realtime };
      }
      case "get_vehicle_history": {
        const userId6 = call.arguments.userId as string;
        const customerId6 = call.arguments.customerId as string;
        const assetIds2 = call.arguments.assetIds as string[];
        const unixStart = call.arguments.unixStart as number;
        const unixEnd = call.arguments.unixEnd as number;
        if (!userId6 || !customerId6 || !assetIds2?.length || unixStart == null || unixEnd == null) {
          return { tool: call.name, result: null, error: "Missing required arguments: userId, customerId, assetIds, unixStart, unixEnd" };
        }
        const history = await getVehicleHistory(userId6, customerId6, assetIds2, unixStart, unixEnd);
        return { tool: call.name, result: history };
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
