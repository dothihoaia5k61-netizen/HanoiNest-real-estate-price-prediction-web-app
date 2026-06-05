from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


NUMERIC_COLUMNS = [
    "price",
    "area",
    "floor_count",
    "frontage_width",
    "house_depth",
    "road_width",
    "bedroom_count",
    "bathroom_count",
]

MIN_PRICE_PER_M2_VND = 20_000_000
MAX_PRICE_PER_M2_VND = 2_000_000_000


@dataclass(frozen=True)
class MarketPosition:
    group: str
    listing_count: int
    median_price_vnd: float | None
    median_price_per_m2_vnd: float | None
    q25_price_per_m2_vnd: float | None
    q75_price_per_m2_vnd: float | None


@dataclass(frozen=True)
class DealScore:
    score: int
    label: str
    price_gap_percent: float | None
    market_gap_percent: float | None
    notes: list[str]


def load_listing_data(path: str | Path = "hanoi_real_estate.csv") -> pd.DataFrame:
    return pd.read_csv(path)


def prepare_market_data(df: pd.DataFrame) -> pd.DataFrame:
    cleaned = df.copy()

    for col in NUMERIC_COLUMNS:
        if col in cleaned.columns:
            cleaned[col] = pd.to_numeric(cleaned[col], errors="coerce")

    cleaned = cleaned[
        cleaned["price"].between(100_000_000, 200_000_000_000, inclusive="both")
        & cleaned["area"].between(10, 1000, inclusive="both")
    ].copy()

    for col in ["property_type_name", "district_name", "ward_name", "street_name", "project_name"]:
        if col in cleaned.columns:
            cleaned[col] = cleaned[col].fillna("Unknown").astype(str).str.strip().replace("", "Unknown")

    cleaned["price_per_m2"] = cleaned["price"] / cleaned["area"]
    cleaned = cleaned[
        cleaned["price_per_m2"].between(
            MIN_PRICE_PER_M2_VND,
            MAX_PRICE_PER_M2_VND,
            inclusive="both",
        )
    ].copy()

    return cleaned.reset_index(drop=True)


def summarize_by(
    df: pd.DataFrame,
    group_col: str,
    min_count: int = 20,
) -> pd.DataFrame:
    if group_col not in df.columns:
        raise KeyError(f"Column does not exist: {group_col}")

    summary = (
        df.groupby(group_col, dropna=False)
        .agg(
            listing_count=("price", "size"),
            median_price_vnd=("price", "median"),
            median_price_per_m2_vnd=("price_per_m2", "median"),
            q25_price_per_m2_vnd=("price_per_m2", lambda s: s.quantile(0.25)),
            q75_price_per_m2_vnd=("price_per_m2", lambda s: s.quantile(0.75)),
            p90_price_per_m2_vnd=("price_per_m2", lambda s: s.quantile(0.90)),
        )
        .reset_index()
    )

    summary = summary[summary["listing_count"] >= min_count]
    return summary.sort_values("median_price_per_m2_vnd", ascending=False).reset_index(drop=True)


def market_position_for_payload(df: pd.DataFrame, payload: dict[str, Any]) -> MarketPosition | None:
    district = payload.get("district_name")
    property_type = payload.get("property_type_name")

    candidates = df.copy()
    group_parts = []

    if district:
        candidates = candidates[candidates["district_name"].eq(district)]
        group_parts.append(str(district))

    if property_type:
        candidates = candidates[candidates["property_type_name"].eq(property_type)]
        group_parts.append(str(property_type))

    if len(candidates) < 10:
        return None

    return MarketPosition(
        group=" / ".join(group_parts) if group_parts else "All listings",
        listing_count=int(len(candidates)),
        median_price_vnd=float(candidates["price"].median()),
        median_price_per_m2_vnd=float(candidates["price_per_m2"].median()),
        q25_price_per_m2_vnd=float(candidates["price_per_m2"].quantile(0.25)),
        q75_price_per_m2_vnd=float(candidates["price_per_m2"].quantile(0.75)),
    )


def find_comparable_listings(
    df: pd.DataFrame,
    payload: dict[str, Any],
    top_n: int = 10,
) -> pd.DataFrame:
    candidates = df.copy()

    district = payload.get("district_name")
    property_type = payload.get("property_type_name")
    area = payload.get("area")

    if district:
        candidates = candidates[candidates["district_name"].eq(district)]

    if property_type:
        candidates = candidates[candidates["property_type_name"].eq(property_type)]

    if candidates.empty:
        return candidates

    area_value = pd.to_numeric(pd.Series([area]), errors="coerce").iloc[0]
    if pd.notna(area_value) and float(area_value) > 0:
        candidates = candidates.assign(area_distance=(candidates["area"] - float(area_value)).abs())
    else:
        candidates = candidates.assign(area_distance=np.nan)

    preferred_columns = [
        "property_type_name",
        "district_name",
        "ward_name",
        "street_name",
        "project_name",
        "price",
        "area",
        "price_per_m2",
        "bedroom_count",
        "bathroom_count",
        "published_at",
        "area_distance",
    ]
    existing_columns = [col for col in preferred_columns if col in candidates.columns]
    return candidates.sort_values(["area_distance", "price_per_m2"], na_position="last").head(top_n)[existing_columns]


def compute_deal_score(
    asking_price_vnd: float | None,
    predicted_price_vnd: float | None,
    market_position: MarketPosition | None,
    area_m2: float | None,
) -> DealScore:
    if asking_price_vnd is None or asking_price_vnd <= 0:
        return DealScore(
            score=0,
            label="Cần nhập giá rao",
            price_gap_percent=None,
            market_gap_percent=None,
            notes=["Nhập giá rao hiện tại để chấm điểm deal."],
        )

    score = 50
    notes: list[str] = []
    price_gap_percent = None
    market_gap_percent = None

    if predicted_price_vnd and predicted_price_vnd > 0:
        price_gap_percent = (asking_price_vnd - predicted_price_vnd) / predicted_price_vnd * 100
        if price_gap_percent <= -15:
            score += 30
            notes.append("Giá rao thấp hơn đáng kể so với giá model ước lượng.")
        elif price_gap_percent <= -5:
            score += 18
            notes.append("Giá rao thấp hơn giá model ước lượng.")
        elif price_gap_percent <= 8:
            score += 8
            notes.append("Giá rao khá gần với giá model ước lượng.")
        elif price_gap_percent <= 20:
            score -= 12
            notes.append("Giá rao cao hơn giá model ước lượng.")
        else:
            score -= 25
            notes.append("Giá rao cao hơn nhiều so với giá model ước lượng.")

    if market_position and market_position.median_price_per_m2_vnd and area_m2 and area_m2 > 0:
        asking_price_per_m2 = asking_price_vnd / area_m2
        market_gap_percent = (
            asking_price_per_m2 - market_position.median_price_per_m2_vnd
        ) / market_position.median_price_per_m2_vnd * 100

        if market_gap_percent <= -15:
            score += 18
            notes.append("Giá/m2 thấp hơn median của nhóm thị trường tương tự.")
        elif market_gap_percent <= 10:
            score += 8
            notes.append("Giá/m2 nằm gần mặt bằng thị trường.")
        else:
            score -= 12
            notes.append("Giá/m2 cao hơn mặt bằng thị trường.")

    if not notes:
        notes.append("Chưa đủ dữ liệu để chấm điểm chi tiết.")

    score = int(max(0, min(100, round(score))))
    if score >= 80:
        label = "Deal đáng chú ý"
    elif score >= 65:
        label = "Có thể xem tiếp"
    elif score >= 45:
        label = "Cần kiểm tra thêm"
    else:
        label = "Rủi ro giá cao"

    return DealScore(
        score=score,
        label=label,
        price_gap_percent=price_gap_percent,
        market_gap_percent=market_gap_percent,
        notes=notes,
    )
