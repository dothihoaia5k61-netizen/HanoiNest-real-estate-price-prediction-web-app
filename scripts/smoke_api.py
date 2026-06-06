from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings(
    "ignore",
    message="Using `httpx` with `starlette.testclient` is deprecated.*",
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient

from api.main import app


SAMPLE_PAYLOAD = {
    "property_type_name": "Nh\u00e0",
    "province_name": "H\u00e0 N\u1ed9i",
    "district_name": "C\u1ea7u Gi\u1ea5y",
    "ward_name": "D\u1ecbch V\u1ecdng",
    "street_name": "C\u1ea7u Gi\u1ea5y",
    "project_name": "Unknown",
    "area": 50.0,
    "floor_count": 4,
    "frontage_width": 4.0,
    "house_depth": 12.0,
    "road_width": 5.0,
    "bedroom_count": 3,
    "bathroom_count": 3,
    "house_direction": "Unknown",
    "balcony_direction": "Unknown",
    "published_at": "2025-06-15T00:00:00",
}


def checked_json(response):
    data = response.json()
    json.dumps(data, allow_nan=False)
    return data


def main() -> None:
    client = TestClient(app)

    health = checked_json(client.get("/health"))
    assert health["model_loaded"] is True, health
    assert health["dataset_loaded"] is True, health
    assert health["sklearn_version"] == "1.5.1", health

    metadata = checked_json(client.get("/metadata/options"))
    assert metadata["districts"], metadata
    assert metadata["property_types"], metadata

    locations_response = client.get(
        "/metadata/locations",
        params={
            "district_name": SAMPLE_PAYLOAD["district_name"],
            "ward_name": SAMPLE_PAYLOAD["ward_name"],
        },
    )
    assert locations_response.status_code == 200, locations_response.text
    locations = checked_json(locations_response)
    assert locations["wards"], locations
    assert locations["streets"], locations

    predict_response = client.post("/predict", json=SAMPLE_PAYLOAD)
    assert predict_response.status_code == 200, predict_response.text
    prediction = checked_json(predict_response)
    assert prediction["predicted_price_vnd"] > 0, prediction
    assert prediction["model_path"] == "models/hanoi_house_price_model.joblib", prediction

    position_response = client.post("/market/position", json=SAMPLE_PAYLOAD)
    assert position_response.status_code == 200, position_response.text
    checked_json(position_response)

    comparables_response = client.post("/market/comparables?top_n=5", json=SAMPLE_PAYLOAD)
    assert comparables_response.status_code == 200, comparables_response.text
    comparables = checked_json(comparables_response)
    assert 0 <= comparables["total"] <= 5, comparables

    summary_response = client.get("/market/summary?group_by=district_name&min_count=50")
    assert summary_response.status_code == 200, summary_response.text
    summary = checked_json(summary_response)
    assert summary["total"] > 0, summary

    score_response = client.post(
        "/deal-score",
        json={
            "property": SAMPLE_PAYLOAD,
            "asking_price_vnd": 9_000_000_000,
            "predicted_price_vnd": prediction["predicted_price_vnd"],
        },
    )
    assert score_response.status_code == 200, score_response.text
    score = checked_json(score_response)
    assert 0 <= score["score"] <= 100, score

    analysis_response = client.post(
        "/analysis",
        json={
            "property": SAMPLE_PAYLOAD,
            "asking_price_vnd": 9_000_000_000,
            "comparable_limit": 3,
        },
    )
    assert analysis_response.status_code == 200, analysis_response.text
    analysis = checked_json(analysis_response)
    assert analysis["prediction"] is not None, analysis
    assert analysis["prediction_error"] is None, analysis
    assert analysis["reference_range"] is not None, analysis
    assert analysis["model_confidence"] is not None, analysis
    assert analysis["model_confidence"]["low_price_vnd"] < prediction["predicted_price_vnd"]
    assert analysis["model_confidence"]["high_price_vnd"] > prediction["predicted_price_vnd"]
    assert 0 <= analysis["comparables"]["total"] <= 3, analysis

    invalid_summary = client.get("/market/summary?group_by=bad_column")
    assert invalid_summary.status_code == 422, invalid_summary.text

    invalid_payload = dict(SAMPLE_PAYLOAD)
    invalid_payload["area"] = -1
    invalid_prediction = client.post("/predict", json=invalid_payload)
    assert invalid_prediction.status_code == 422, invalid_prediction.text

    print(
        json.dumps(
            {
                "status": "ok",
                "predicted_price_vnd": round(prediction["predicted_price_vnd"], 2),
                "comparables": comparables["total"],
                "summary_rows": summary["total"],
                "deal_score": score["score"],
                "wards": len(locations["wards"]),
                "streets": len(locations["streets"]),
            },
            ensure_ascii=True,
        )
    )


if __name__ == "__main__":
    main()
