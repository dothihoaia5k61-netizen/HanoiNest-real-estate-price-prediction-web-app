import type {
  AnalysisResponse,
  LocationOptions,
  MarketSummaryResponse,
  MetadataOptions,
  PropertyPayload,
} from "./types";

const API_PREFIX = import.meta.env.VITE_API_BASE_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || `API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getMetadata(): Promise<MetadataOptions> {
  return request("/metadata/options");
}

export function getLocationOptions(
  districtName: string,
  wardName?: string,
): Promise<LocationOptions> {
  const params = new URLSearchParams({ district_name: districtName });
  if (wardName && wardName !== "Unknown") params.set("ward_name", wardName);
  return request(`/metadata/locations?${params.toString()}`);
}

export function getMarketSummary(
  groupBy: "district_name" | "property_type_name",
): Promise<MarketSummaryResponse> {
  return request(`/market/summary?group_by=${groupBy}&min_count=50`);
}

export function analyzeProperty(
  property: PropertyPayload,
  askingPriceVnd?: number | null,
): Promise<AnalysisResponse> {
  return request("/analysis", {
    method: "POST",
    body: JSON.stringify({
      property,
      asking_price_vnd: askingPriceVnd || null,
      comparable_limit: 12,
    }),
  });
}
