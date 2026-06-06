from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class PropertyPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    property_type_name: str = Field(..., min_length=1)
    province_name: str = Field(default="H\u00e0 N\u1ed9i")
    district_name: str = Field(..., min_length=1)
    ward_name: str = Field(default="Unknown")
    street_name: str = Field(default="Unknown")
    project_name: str = Field(default="Unknown")
    area: float = Field(..., gt=0)
    floor_count: int | None = Field(default=None, ge=0, le=100)
    frontage_width: float | None = Field(default=None, ge=0)
    house_depth: float | None = Field(default=None, ge=0)
    road_width: float | None = Field(default=None, ge=0)
    bedroom_count: int | None = Field(default=None, ge=0, le=100)
    bathroom_count: int | None = Field(default=None, ge=0, le=100)
    house_direction: str = Field(default="Unknown")
    balcony_direction: str = Field(default="Unknown")
    published_at: str | None = Field(default=None)

    @field_validator(
        "province_name",
        "ward_name",
        "street_name",
        "project_name",
        "house_direction",
        "balcony_direction",
        mode="before",
    )
    @classmethod
    def blank_string_to_unknown(cls, value: Any) -> Any:
        if value is None:
            return "Unknown"
        if isinstance(value, str) and not value.strip():
            return "Unknown"
        return value

    @model_validator(mode="after")
    def derive_house_depth(self) -> "PropertyPayload":
        if self.frontage_width and self.frontage_width > 0:
            self.house_depth = self.area / self.frontage_width
        return self

    def to_core_payload(self) -> dict[str, Any]:
        return self.model_dump()


class PredictionResponse(BaseModel):
    predicted_price_vnd: float
    predicted_price_per_m2_vnd: float | None
    formatted_price: str
    formatted_price_per_m2: str | None
    selected_model: str | None
    model_path: str
    warnings: list[str] = Field(default_factory=list)


class MarketPositionResponse(BaseModel):
    group: str
    listing_count: int
    median_price_vnd: float | None
    median_price_per_m2_vnd: float | None
    q25_price_per_m2_vnd: float | None
    q75_price_per_m2_vnd: float | None
    formatted_median_price: str | None
    formatted_median_price_per_m2: str | None


class ComparableListingsResponse(BaseModel):
    total: int
    rows: list[dict[str, Any]]


class DealScoreRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    property: PropertyPayload
    asking_price_vnd: float | None = Field(default=None, ge=0)
    predicted_price_vnd: float | None = Field(default=None, ge=0)


class DealScoreResponse(BaseModel):
    score: int
    label: str
    price_gap_percent: float | None
    market_gap_percent: float | None
    notes: list[str]


class ReferenceRangeResponse(BaseModel):
    low_price_vnd: float
    median_price_vnd: float
    high_price_vnd: float
    formatted_low_price: str
    formatted_median_price: str
    formatted_high_price: str
    model_gap_to_median_percent: float | None
    model_position: str
    market_spread_percent: float
    data_coverage_label: str
    listing_count: int


class ModelConfidenceResponse(BaseModel):
    low_price_vnd: float
    high_price_vnd: float
    formatted_low_price: str
    formatted_high_price: str
    mae_vnd: float
    rmse_vnd: float
    mape_percent: float
    r2: float
    label: str
    methodology: str


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    property: PropertyPayload
    asking_price_vnd: float | None = Field(default=None, ge=0)
    comparable_limit: int = Field(default=10, ge=1, le=50)


class AnalysisResponse(BaseModel):
    input: dict[str, Any]
    prediction: PredictionResponse | None
    prediction_error: str | None
    market_position: MarketPositionResponse | None
    reference_range: ReferenceRangeResponse | None
    model_confidence: ModelConfidenceResponse | None
    deal_score: DealScoreResponse | None
    comparables: ComparableListingsResponse


class MarketSummaryResponse(BaseModel):
    group_by: str
    min_count: int
    total: int
    rows: list[dict[str, Any]]


class MetadataOptionsResponse(BaseModel):
    property_types: list[str]
    districts: list[str]
    house_directions: list[str]
    balcony_directions: list[str]


class LocationOptionsResponse(BaseModel):
    district_name: str
    ward_name: str | None
    wards: list[str]
    streets: list[str]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    dataset_loaded: bool
    selected_model: str | None
    model_path: str | None
    market_rows: int | None
    sklearn_version: str
    errors: list[str] = Field(default_factory=list)


class ApiIndexResponse(BaseModel):
    name: str
    version: str
    docs_url: str
    health_url: str
