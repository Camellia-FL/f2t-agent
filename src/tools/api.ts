const F2T_API_BASE_URL = process.env.F2T_API_BASE_URL || "https://f2t-webapp-staging.azurewebsites.net/api";

interface SelfInfoResponse {
  user: {
    firstName: string;
    lastName: string;
    role: string;
    isRoot: boolean;
  };
  customer: {
    name: string;
    timezone: string;
  };
}

export async function getSelfInfo(userId: string, customerId: string): Promise<SelfInfoResponse> {
  const res = await fetch(`${F2T_API_BASE_URL}/agent/getSelfInfo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, customerId }),
  });
  if (!res.ok) throw new Error(`f2t API returned ${res.status}`);
  return res.json() as Promise<SelfInfoResponse>;
}

export interface AssetSearchResult {
  assetId: string;
  plate: string | null;
  model: string | null;
  brand: string | null;
}

export async function searchAsset(userId: string, customerId: string, search: string): Promise<AssetSearchResult[]> {
  const res = await fetch(`${F2T_API_BASE_URL}/agent/searchAsset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, customerId, search }),
  });
  if (!res.ok) throw new Error(`f2t API returned ${res.status}`);
  const data = await res.json() as { assets: AssetSearchResult[] };
  return data.assets;
}

export async function getAllAssetRegistries(
  userId: string,
  customerId: string,
  fields: string[],
  cardinality?: boolean
): Promise<Record<string, string | null>[] | Record<string, string[]>> {
  const res = await fetch(`${F2T_API_BASE_URL}/agent/getAllAssetRegistries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, customerId, fields, ...(cardinality !== undefined ? { cardinality } : {}) }),
  });
  if (!res.ok) throw new Error(`f2t API returned ${res.status}`);
  return res.json() as Promise<Record<string, string | null>[] | Record<string, string[]>>;
}

export async function searchUser(
  userId: string,
  customerId: string,
  search: string,
  fields?: string[]
): Promise<Record<string, string | null>[]> {
  const res = await fetch(`${F2T_API_BASE_URL}/agent/searchUser`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, customerId, search, ...(fields?.length ? { fields } : {}) }),
  });
  if (!res.ok) throw new Error(`f2t API returned ${res.status}`);
  const data = await res.json() as { users: Record<string, string | null>[] };
  return data.users;
}