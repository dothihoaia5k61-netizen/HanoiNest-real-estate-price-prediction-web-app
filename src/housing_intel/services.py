from __future__ import annotations

import math
from dataclasses import asdict
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from src.housing_intel.market import (
    MarketPosition,
    compute_deal_score,
    find_comparable_listings,
    load_listing_data,
    market_position_for_payload,
    prepare_market_data,
    summarize_by,
)
from src.housing_intel.predictor import PROJECT_ROOT, format_vnd, load_model_artifact, predict_from_payload
from src.housing_intel.schemas import (
    ComparableListingsResponse,
    DealScoreResponse,
    MarketPositionResponse,
    ModelConfidenceResponse,
    PredictionResponse,
    PropertyPayload,
    ReferenceRangeResponse,
)


SUMMARY_GROUP_COLUMNS = {
    "district_name",
    "property_type_name",
    "ward_name",
    "street_name",
}


@lru_cache(maxsize=1)
def get_model_artifact() -> dict[str, Any]:
    return load_model_artifact()


@lru_cache(maxsize=1)
def get_market_data() -> pd.DataFrame:
    return prepare_market_data(load_listing_data())


def clear_service_caches() -> None:
    get_model_artifact.cache_clear()
    get_market_data.cache_clear()


def prediction_response_from_payload(payload: PropertyPayload) -> PredictionResponse:
    result = predict_from_payload(payload.to_core_payload(), artifact=get_model_artifact())
    return PredictionResponse(
        predicted_price_vnd=result.predicted_price_vnd,
        predicted_price_per_m2_vnd=result.predicted_price_per_m2_vnd,
        formatted_price=result.formatted_price,
        formatted_price_per_m2=(
            format_vnd(result.predicted_price_per_m2_vnd)
            if result.predicted_price_per_m2_vnd is not None
            else None
        ),
        selected_model=result.selected_model,
        model_path=public_path(result.model_path),
        warnings=result.warnings,
    )


def market_position_response_from_payload(payload: PropertyPayload) -> MarketPositionResponse | None:
    position = market_position_for_payload(get_market_data(), payload.to_core_payload())
    return market_position_to_response(position)


def market_position_to_response(position: MarketPosition | None) -> MarketPositionResponse | None:
    if position is None:
        return None

    return MarketPositionResponse(
        group=position.group,
        listing_count=position.listing_count,
        median_price_vnd=clean_json_value(position.median_price_vnd),
        median_price_per_m2_vnd=clean_json_value(position.median_price_per_m2_vnd),
        q25_price_per_m2_vnd=clean_json_value(position.q25_price_per_m2_vnd),
        q75_price_per_m2_vnd=clean_json_value(position.q75_price_per_m2_vnd),
        formatted_median_price=(
            format_vnd(position.median_price_vnd)
            if position.median_price_vnd is not None
            else None
        ),
        formatted_median_price_per_m2=(
            format_vnd(position.median_price_per_m2_vnd)
            if position.median_price_per_m2_vnd is not None
            else None
        ),
    )


def comparable_listings_response(
    payload: PropertyPayload,
    top_n: int,
) -> ComparableListingsResponse:
    rows = find_comparable_listings(get_market_data(), payload.to_core_payload(), top_n=top_n)
    records = dataframe_records(rows)
    return ComparableListingsResponse(total=len(records), rows=records)


def deal_score_response(
    payload: PropertyPayload,
    asking_price_vnd: float | None,
    predicted_price_vnd: float | None = None,
) -> DealScoreResponse:
    market_position = market_position_for_payload(get_market_data(), payload.to_core_payload())
    deal = compute_deal_score(
        asking_price_vnd=asking_price_vnd,
        predicted_price_vnd=predicted_price_vnd,
        market_position=market_position,
        area_m2=payload.area,
    )
    data = asdict(deal)
    return DealScoreResponse(**clean_json_value(data))


def reference_range_response(
    payload: PropertyPayload,
    prediction: PredictionResponse | None,
    market_position: MarketPositionResponse | None,
) -> ReferenceRangeResponse | None:
    if (
        market_position is None
        or market_position.q25_price_per_m2_vnd is None
        or market_position.median_price_per_m2_vnd is None
        or market_position.q75_price_per_m2_vnd is None
    ):
        return None

    low_price = market_position.q25_price_per_m2_vnd * payload.area
    median_price = market_position.median_price_per_m2_vnd * payload.area
    high_price = market_position.q75_price_per_m2_vnd * payload.area
    model_gap = None
    model_position = "Chưa có giá model"

    if prediction is not None and median_price > 0:
        model_gap = (prediction.predicted_price_vnd - median_price) / median_price * 100
        if prediction.predicted_price_vnd < low_price:
            model_position = "Thấp hơn dải thị trường"
        elif prediction.predicted_price_vnd > high_price:
            model_position = "Cao hơn dải thị trường"
        else:
            model_position = "Nằm trong dải thị trường"

    spread = (high_price - low_price) / median_price * 100 if median_price > 0 else 0.0
    listing_count = market_position.listing_count
    if listing_count >= 1000:
        coverage = "Độ phủ dữ liệu cao"
    elif listing_count >= 100:
        coverage = "Độ phủ dữ liệu khá"
    elif listing_count >= 30:
        coverage = "Độ phủ dữ liệu vừa"
    else:
        coverage = "Độ phủ dữ liệu thấp"

    return ReferenceRangeResponse(
        low_price_vnd=low_price,
        median_price_vnd=median_price,
        high_price_vnd=high_price,
        formatted_low_price=format_vnd(low_price),
        formatted_median_price=format_vnd(median_price),
        formatted_high_price=format_vnd(high_price),
        model_gap_to_median_percent=model_gap,
        model_position=model_position,
        market_spread_percent=spread,
        data_coverage_label=coverage,
        listing_count=listing_count,
    )


def model_confidence_response(
    prediction: PredictionResponse | None,
) -> ModelConfidenceResponse | None:
    if prediction is None:
        return None

    artifact = get_model_artifact()
    selected_model = artifact.get("selected_model")
    metrics = artifact.get("metrics", {}).get(selected_model, {})
    required = ("mae", "rmse", "mape_percent", "r2")
    if not all(key in metrics for key in required):
        return None

    mae = float(metrics["mae"])
    rmse = float(metrics["rmse"])
    mape = float(metrics["mape_percent"])
    r2 = float(metrics["r2"])
    low_price = max(0.0, prediction.predicted_price_vnd - mae)
    high_price = prediction.predicted_price_vnd + mae

    if r2 >= 0.85 and mape <= 20:
        label = "Độ tin cậy cao"
    elif r2 >= 0.75:
        label = "Độ tin cậy khá"
    else:
        label = "Cần thêm dữ liệu kiểm chứng"

    return ModelConfidenceResponse(
        low_price_vnd=low_price,
        high_price_vnd=high_price,
        formatted_low_price=format_vnd(low_price),
        formatted_high_price=format_vnd(high_price),
        mae_vnd=mae,
        rmse_vnd=rmse,
        mape_percent=mape,
        r2=r2,
        label=label,
        methodology="Khoảng ước tính dựa trên sai số tuyệt đối trung bình (MAE) của tập validation.",
    )


def market_summary_records(group_by: str, min_count: int) -> list[dict[str, Any]]:
    if group_by not in SUMMARY_GROUP_COLUMNS:
        allowed = ", ".join(sorted(SUMMARY_GROUP_COLUMNS))
        raise ValueError(f"Unsupported group_by: {group_by}. Allowed values: {allowed}.")

    summary = summarize_by(get_market_data(), group_by, min_count=min_count)
    return dataframe_records(summary)


def metadata_options() -> dict[str, list[str]]:
    df = get_market_data()
    return {
        "property_types": sorted_unique(df, "property_type_name"),
        "districts": sorted_unique(df, "district_name"),
        "house_directions": sorted_unique(df, "house_direction"),
        "balcony_directions": sorted_unique(df, "balcony_direction"),
    }


def location_options(district_name: str, ward_name: str | None = None) -> dict[str, Any]:
    df = get_market_data()
    district_rows = df[df["district_name"].eq(district_name)]
    wards = ranked_unique(district_rows, "ward_name")

    street_rows = district_rows
    if ward_name and ward_name != "Unknown":
        street_rows = district_rows[district_rows["ward_name"].eq(ward_name)]

    return {
        "district_name": district_name,
        "ward_name": ward_name,
        "wards": wards,
        "streets": ranked_unique(street_rows, "street_name"),
    }


def ranked_unique(df: pd.DataFrame, column: str) -> list[str]:
    if column not in df.columns:
        return []
    values = df[column].dropna().astype(str).str.strip()
    values = values[values.ne("") & values.ne("Unknown")]
    return values.value_counts().index.tolist()


def sorted_unique(df: pd.DataFrame, column: str) -> list[str]:
    if column not in df.columns:
        return []
    values = df[column].dropna().astype(str).str.strip()
    values = values[values.ne("")]
    return sorted(values.unique().tolist())


def dataframe_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    object_df = df.astype(object).where(pd.notnull(df), None)
    return [clean_json_value(record) for record in object_df.to_dict(orient="records")]


def clean_json_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): clean_json_value(item) for key, item in value.items()}

    if isinstance(value, list):
        return [clean_json_value(item) for item in value]

    if isinstance(value, tuple):
        return [clean_json_value(item) for item in value]

    if value is None:
        return None

    if isinstance(value, (datetime, date, pd.Timestamp)):
        return value.isoformat()

    if isinstance(value, np.integer):
        return int(value)

    if isinstance(value, np.floating):
        value = float(value)

    if isinstance(value, float):
        return value if math.isfinite(value) else None

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    return value


def public_path(path: str) -> str:
    try:
        return str(Path(path).resolve().relative_to(PROJECT_ROOT)).replace("\\", "/")
    except ValueError:
        return path
