const REPORT_BASE_URL = process.env.REPORT_BASE_URL || "http://57.153.100.38:8081";

export interface ReportRequest {
  tsStart: number;
  tsEnd: number;
  reportType: "location" | "location-all";
  items: string[];
  features: string[];
  computationType: "realtime" | "aggregated";
  scope?: string;
}

export interface AssetStats {
  totalKm?: number | null;
  totalFuelConsumptionL?: number | null;
  avgFuelConsumptionL?: number | null;
  totalCo2ConsumptionKg?: number | null;
  fuelType?: string | null;
  totalFuelIncr?: number | null;
  totalFuelIncrL?: number | null;
  totalFuelDecr?: number | null;
  totalFuelDecrL?: number | null;
  totalIdleS?: number | null;
  totalMovingS?: number | null;
  totalStoppedS?: number | null;
  totalIdleFuelConsumptionL?: number | null;
  anomalyState?: boolean | null;
  statsInTsRange?: Array<Record<string, unknown>>;
}

export interface ReportResponse {
  status: string;
  error?: string | null;
  totalItems?: number | null;
  fleetTotalKm?: number | null;
  fleetTotalFuelConsumptionL?: number | null;
  fleetAvgFuelConsumptionL?: number | null;
  fleetTotalCo2ConsumptionKg?: number | null;
  fleetTotalFuelIncr?: number | null;
  fleetTotalFuelIncrL?: number | null;
  fleetTotalFuelDecr?: number | null;
  fleetTotalFuelDecrL?: number | null;
  fleetTotalIdleS?: number | null;
  fleetTotalMovingS?: number | null;
  fleetTotalStoppedS?: number | null;
  fleetTotalIdleFuelConsumptionL?: number | null;
  items?: Record<string, AssetStats> | null;
  granularity?: string | null;
  cached?: boolean | null;
}

export async function createReport(params: ReportRequest): Promise<ReportResponse> {
  const res = await fetch(`${REPORT_BASE_URL}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Report API returned ${res.status}`);
  return res.json() as Promise<ReportResponse>;
}
