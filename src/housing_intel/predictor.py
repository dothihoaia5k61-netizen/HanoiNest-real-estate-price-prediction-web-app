from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd


MODEL_PATH_CANDIDATES = [
    Path("models/hanoi_house_price_model.joblib"),
    Path("hanoi_house_price_model.joblib"),
    Path("best_model.joblib"),
    Path("model.joblib"),
]

RAW_MODEL_COLUMNS = [
    "property_type_name",
    "province_name",
    "district_name",
    "ward_name",
    "street_name",
    "project_name",
    "area",
    "floor_count",
    "frontage_width",
    "house_depth",
    "road_width",
    "bedroom_count",
    "bathroom_count",
    "house_direction",
    "balcony_direction",
    "published_at",
]


@dataclass(frozen=True)
class PredictionResult:
    predicted_price_vnd: float
    predicted_price_per_m2_vnd: float | None
    formatted_price: str
    selected_model: str | None
    model_path: str
    warnings: list[str] = field(default_factory=list)


def find_model_path(candidates: list[Path] | None = None) -> Path:
    for path in candidates or MODEL_PATH_CANDIDATES:
        if path.exists():
            return path
    raise FileNotFoundError("Cannot find a model artifact in the configured paths.")


def load_model_artifact(model_path: str | Path | None = None) -> dict[str, Any]:
    path = Path(model_path) if model_path else find_model_path()
    artifact = joblib.load(path)

    if not isinstance(artifact, dict) or "model" not in artifact:
        raise ValueError(f"Invalid model artifact: {path}")

    artifact["_model_path"] = str(path)
    return artifact


def engineer_features_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Create inference features without using the target price."""
    X = df.copy()

    if "published_at" in X.columns:
        published = pd.to_datetime(X["published_at"], errors="coerce", utc=True)
        X["published_year"] = published.dt.year.fillna(0).astype(int)
        X["published_month"] = published.dt.month.fillna(0).astype(int)
    else:
        X["published_year"] = 0
        X["published_month"] = 0

    X["area"] = pd.to_numeric(X.get("area"), errors="coerce")
    X["area_log"] = np.log1p(X["area"].clip(lower=0))

    project = X.get("project_name", pd.Series([""] * len(X)))
    project = project.fillna("").astype(str).str.strip()
    X["is_project_known"] = np.where(project.ne("") & project.ne("Unknown"), 1, 0)

    X = X.drop(columns=["province_name", "published_at"], errors="ignore")
    return X


def make_prediction_frame(payload: dict[str, Any]) -> pd.DataFrame:
    row = {col: payload.get(col) for col in RAW_MODEL_COLUMNS}
    row["province_name"] = row.get("province_name") or "Hà Nội"
    row["project_name"] = row.get("project_name") or "Unknown"
    row["published_at"] = row.get("published_at") or None

    return pd.DataFrame([row], columns=RAW_MODEL_COLUMNS)


def predict_price_vnd(artifact: dict[str, Any], payload: dict[str, Any]) -> float:
    model = artifact["model"]
    raw_input = make_prediction_frame(payload)
    X_input = engineer_features_frame(raw_input)
    pred = float(model.predict(X_input)[0])

    if not np.isfinite(pred):
        raise ValueError("Model returned a non-finite prediction.")

    return max(pred, 0.0)


def format_vnd(value: float) -> str:
    if not np.isfinite(value):
        return "Không xác định"

    if abs(value) >= 1_000_000_000:
        text = f"{value / 1_000_000_000:,.2f} tỷ VNĐ"
    elif abs(value) >= 1_000_000:
        text = f"{value / 1_000_000:,.2f} triệu VNĐ"
    else:
        text = f"{value:,.0f} VNĐ"

    return text.replace(",", "X").replace(".", ",").replace("X", ".")


def predict_from_payload(
    payload: dict[str, Any],
    artifact: dict[str, Any] | None = None,
    model_path: str | Path | None = None,
) -> PredictionResult:
    loaded_artifact = artifact or load_model_artifact(model_path)
    predicted_price = predict_price_vnd(loaded_artifact, payload)

    area = pd.to_numeric(pd.Series([payload.get("area")]), errors="coerce").iloc[0]
    price_per_m2 = None
    if pd.notna(area) and float(area) > 0:
        price_per_m2 = predicted_price / float(area)

    warnings = []
    for key in ["district_name", "property_type_name", "area"]:
        if payload.get(key) in (None, "", "Unknown"):
            warnings.append(f"Missing important input: {key}")

    return PredictionResult(
        predicted_price_vnd=predicted_price,
        predicted_price_per_m2_vnd=price_per_m2,
        formatted_price=format_vnd(predicted_price),
        selected_model=loaded_artifact.get("selected_model"),
        model_path=str(loaded_artifact.get("_model_path", model_path or "")),
        warnings=warnings,
    )
