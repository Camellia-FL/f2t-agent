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

// --- New: Vehicle Realtime ---

interface GeoPoint {
  type: string;
  coordinates: [number, number];
}

interface SensorValue {
  value: number;
  unit: string;
}

interface Sensor {
  id: string;
  label: string;
  value: SensorValue;
}

interface LastLocationDetailDto {
  assetId: string;
  deviceId: string;
  customerId: string;
  acquisitionTimestamp: number;
  location: GeoPoint;
  speed?: number | null;
  altitude?: number | null;
  heading?: number | null;
  satellites?: number | null;
  state: string;
  triggerSensorId?: string | null;
  address?: string | null;
  streetLimit?: number | null;
  sensors?: Record<string, Sensor> | null;
  driverName?: string | null;
}

interface AssetLocationDetailDto {
  plate?: string | null;
  model?: string | null;
  customCode?: string | null;
  profileName?: string;
  isVisible?: boolean;
}

export interface VehicleRealtimeResponse {
  locations: Record<string, LastLocationDetailDto>;
  assets: Record<string, AssetLocationDetailDto>;
}

export async function getVehicleRealtime(
  userId: string,
  customerId: string,
  assetIds: string[]
): Promise<VehicleRealtimeResponse> {
  const res = await fetch(`${F2T_API_BASE_URL}/agent/getVehicleRealtime`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, customerId, assetIds }),
  });
  if (!res.ok) throw new Error(`f2t API returned ${res.status}`);
  return res.json() as Promise<VehicleRealtimeResponse>;
}

// --- New: Vehicle History ---

export interface HistoryPosition {
  id: string;
  coordinates: [number, number];
  acquisitionTimestamp: number;
  address?: string;
  speed?: number;
  heading?: number;
  driverName?: string;
  state: string;
}

export interface HistoryTripRange {
  id: string;
  startAddress: string;
  startTimestamp: number;
  stopAddress?: string | null;
  stopTimestamp?: number | null;
  distanceKilometers?: number;
  driveDurationSeconds?: number;
  parkDurationSeconds?: number;
  startIndex: number;
  endIndexExclusive: number;
}

export interface HistoryAggregates {
  positionCount: number;
  tripCount?: number;
  firstTimestamp?: number;
  lastTimestamp?: number;
}

export interface HistoryAsset {
  positions: HistoryPosition[];
  trips?: HistoryTripRange[];
  aggregates?: HistoryAggregates;
}

export type VehicleHistoryResponse = Record<string, HistoryAsset>;

export async function getVehicleHistory(
  userId: string,
  customerId: string,
  assetIds: string[],
  unixStart: number,
  unixEnd: number
): Promise<VehicleHistoryResponse | null> {
  const res = await fetch(`${F2T_API_BASE_URL}/agent/getVehicleHistory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, customerId, assetIds, unixStart, unixEnd }),
  });
  if (!res.ok) throw new Error(`f2t API returned ${res.status}`);
  return res.json() as Promise<VehicleHistoryResponse | null>;
}