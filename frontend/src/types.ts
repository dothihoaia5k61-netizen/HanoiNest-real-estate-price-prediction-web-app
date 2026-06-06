export type PropertyPayload = {
  property_type_name: string;
  province_name: string;
  district_name: string;
  ward_name: string;
  street_name: string;
  project_name: string;
  area: number;
  floor_count: number | null;
  frontage_width: number | null;
  house_depth: number | null;
  road_width: number | null;
  bedroom_count: number | null;
  bathroom_count: number | null;
  house_direction: string;
  balcony_direction: string;
  published_at: string | null;
};

export type Prediction = {
  predicted_price_vnd: number;
  predicted_price_per_m2_vnd: number | null;
  formatted_price: string;
  formatted_price_per_m2: string | null;
  selected_model: string | null;
  model_path: string;
  warnings: string[];
};

export type MarketPosition = {
  group: string;
  listing_count: number;
  median_price_vnd: number | null;
  median_price_per_m2_vnd: number | null;
  q25_price_per_m2_vnd: number | null;
  q75_price_per_m2_vnd: number | null;
  formatted_median_price: string | null;
  formatted_median_price_per_m2: string | null;
};

export type ComparableRow = {
  property_type_name?: string;
  district_name?: string;
  ward_name?: string;
  street_name?: string;
  project_name?: string;
  price?: number;
  area?: number;
  price_per_m2?: number;
  bedroom_count?: number;
  bathroom_count?: number;
  published_at?: string;
  location_rank?: number;
  area_distance?: number;
};

export type ReferenceRange = {
  low_price_vnd: number;
  median_price_vnd: number;
  high_price_vnd: number;
  formatted_low_price: string;
  formatted_median_price: string;
  formatted_high_price: string;
  model_gap_to_median_percent: number | null;
  model_position: string;
  market_spread_percent: number;
  data_coverage_label: string;
  listing_count: number;
};

export type ModelConfidence = {
  low_price_vnd: number;
  high_price_vnd: number;
  formatted_low_price: string;
  formatted_high_price: string;
  mae_vnd: number;
  rmse_vnd: number;
  mape_percent: number;
  r2: number;
  label: string;
  methodology: string;
};

export type DealScore = {
  score: number;
  label: string;
  price_gap_percent: number | null;
  market_gap_percent: number | null;
  notes: string[];
};

export type AnalysisResponse = {
  input: PropertyPayload;
  prediction: Prediction | null;
  prediction_error: string | null;
  market_position: MarketPosition | null;
  reference_range: ReferenceRange | null;
  model_confidence: ModelConfidence | null;
  deal_score: DealScore | null;
  comparables: {
    total: number;
    rows: ComparableRow[];
  };
};

export type MetadataOptions = {
  property_types: string[];
  districts: string[];
  house_directions: string[];
  balcony_directions: string[];
};

export type LocationOptions = {
  district_name: string;
  ward_name: string | null;
  wards: string[];
  streets: string[];
};

export type MarketSummaryRow = {
  district_name?: string;
  property_type_name?: string;
  listing_count: number;
  median_price_vnd: number;
  median_price_per_m2_vnd: number;
  q25_price_per_m2_vnd: number;
  q75_price_per_m2_vnd: number;
  p90_price_per_m2_vnd: number;
};

export type MarketSummaryResponse = {
  group_by: string;
  min_count: number;
  total: number;
  rows: MarketSummaryRow[];
};
