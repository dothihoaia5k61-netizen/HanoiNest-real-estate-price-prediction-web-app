from __future__ import annotations

import sklearn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from src.housing_intel.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    ApiIndexResponse,
    ComparableListingsResponse,
    DealScoreRequest,
    DealScoreResponse,
    HealthResponse,
    MarketPositionResponse,
    MarketSummaryResponse,
    MetadataOptionsResponse,
    PredictionResponse,
    PropertyPayload,
)
from src.housing_intel.services import (
    comparable_listings_response,
    deal_score_response,
    get_market_data,
    get_model_artifact,
    market_position_response_from_payload,
    market_summary_records,
    metadata_options,
    prediction_response_from_payload,
    public_path,
)


API_VERSION = "0.1.0"


app = FastAPI(
    title="Hanoi Real Estate Intelligence API",
    version=API_VERSION,
    description=(
        "FastAPI backend for house price prediction, market benchmarks, "
        "comparable listings, and deal scoring."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=ApiIndexResponse, tags=["system"])
def read_index() -> ApiIndexResponse:
    return ApiIndexResponse(
        name="Hanoi Real Estate Intelligence API",
        version=API_VERSION,
        docs_url="/docs",
        health_url="/health",
    )


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health_check() -> HealthResponse:
    errors: list[str] = []
    model_loaded = False
    dataset_loaded = False
    selected_model = None
    model_path = None
    market_rows = None

    try:
        artifact = get_model_artifact()
        model_loaded = True
        selected_model = artifact.get("selected_model")
        model_path = public_path(str(artifact.get("_model_path", "")))
    except Exception as exc:  # pragma: no cover - depends on local artifact availability
        errors.append(f"model: {exc}")

    try:
        market_df = get_market_data()
        dataset_loaded = True
        market_rows = int(len(market_df))
    except Exception as exc:  # pragma: no cover - depends on local CSV availability
        errors.append(f"dataset: {exc}")

    return HealthResponse(
        status="ok" if not errors else "degraded",
        model_loaded=model_loaded,
        dataset_loaded=dataset_loaded,
        selected_model=selected_model,
        model_path=model_path,
        market_rows=market_rows,
        sklearn_version=sklearn.__version__,
        errors=errors,
    )


@app.get("/metadata/options", response_model=MetadataOptionsResponse, tags=["metadata"])
def read_metadata_options() -> MetadataOptionsResponse:
    try:
        return MetadataOptionsResponse(**metadata_options())
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Cannot load metadata options: {exc}") from exc


@app.post("/predict", response_model=PredictionResponse, tags=["valuation"])
def predict_price(payload: PropertyPayload) -> PredictionResponse:
    try:
        return prediction_response_from_payload(payload)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


@app.post("/market/position", response_model=MarketPositionResponse | None, tags=["market"])
def read_market_position(payload: PropertyPayload) -> MarketPositionResponse | None:
    try:
        return market_position_response_from_payload(payload)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Market position failed: {exc}") from exc


@app.post("/market/comparables", response_model=ComparableListingsResponse, tags=["market"])
def read_comparable_listings(
    payload: PropertyPayload,
    top_n: int = Query(default=10, ge=1, le=50),
) -> ComparableListingsResponse:
    try:
        return comparable_listings_response(payload, top_n=top_n)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Comparable listing search failed: {exc}") from exc


@app.get("/market/summary", response_model=MarketSummaryResponse, tags=["market"])
def read_market_summary(
    group_by: str = Query(default="district_name"),
    min_count: int = Query(default=50, ge=1, le=10000),
) -> MarketSummaryResponse:
    try:
        rows = market_summary_records(group_by=group_by, min_count=min_count)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Market summary failed: {exc}") from exc

    return MarketSummaryResponse(
        group_by=group_by,
        min_count=min_count,
        total=len(rows),
        rows=rows,
    )


@app.post("/deal-score", response_model=DealScoreResponse, tags=["valuation"])
def read_deal_score(request: DealScoreRequest) -> DealScoreResponse:
    try:
        return deal_score_response(
            payload=request.property,
            asking_price_vnd=request.asking_price_vnd,
            predicted_price_vnd=request.predicted_price_vnd,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Deal score failed: {exc}") from exc


@app.post("/analysis", response_model=AnalysisResponse, tags=["analysis"])
def analyze_property(request: AnalysisRequest) -> AnalysisResponse:
    prediction = None
    prediction_error = None

    try:
        prediction = prediction_response_from_payload(request.property)
    except Exception as exc:
        prediction_error = str(exc)

    try:
        market_position = market_position_response_from_payload(request.property)
        comparables = comparable_listings_response(
            request.property,
            top_n=request.comparable_limit,
        )
        deal_score = deal_score_response(
            payload=request.property,
            asking_price_vnd=request.asking_price_vnd,
            predicted_price_vnd=prediction.predicted_price_vnd if prediction else None,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Analysis failed: {exc}") from exc

    return AnalysisResponse(
        input=request.property.to_core_payload(),
        prediction=prediction,
        prediction_error=prediction_error,
        market_position=market_position,
        deal_score=deal_score,
        comparables=comparables,
    )
