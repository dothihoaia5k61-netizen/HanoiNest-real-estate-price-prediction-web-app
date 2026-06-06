# API Phase 1

This phase exposes the existing project core through FastAPI without changing the
Streamlit prototype flow.

## Run

```powershell
.\.venv\Scripts\python.exe -m uvicorn api.main:app --reload --port 8000
```

Open:

- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

## Smoke Test

```powershell
.\.venv\Scripts\python.exe scripts\smoke_api.py
```

The script checks health, metadata, prediction, market position, comparables,
market summary, deal score, analysis, and expected validation errors.

## Endpoints

### GET /

Returns API name, version, docs URL, and health URL.

### GET /health

Checks model artifact loading, listing dataset loading, market row count, and the
active scikit-learn version.

### GET /metadata/options

Returns filter options derived from the prepared listing data:

- `property_types`
- `districts`
- `house_directions`
- `balcony_directions`

### GET /metadata/locations

Returns cascading address options for the frontend:

- wards filtered by `district_name`
- streets filtered by `district_name` and optional `ward_name`

### POST /predict

Runs the trained model for one property payload.

### POST /market/position

Compares the property payload against listings with the same district and
property type. Returns median and quantile market benchmarks when there are
enough listings.

### POST /market/comparables?top_n=10

Returns comparable listings filtered by district and property type, then sorted
by area distance and price per square meter.

### GET /market/summary?group_by=district_name&min_count=50

Returns grouped market summary rows. Supported `group_by` values:

- `district_name`
- `property_type_name`
- `ward_name`
- `street_name`

### POST /deal-score

Scores a listing from asking price, optional predicted price, and market
position.

### POST /analysis

One-shot endpoint for the future web frontend. It returns:

- normalized input
- model prediction
- model confidence range derived from validation MAE
- market position
- reference price range from Q25, median, and Q75
- optional legacy deal score when an asking price is supplied
- comparable listings

If model prediction fails but market data is available, this endpoint keeps the
market response and includes `prediction_error`.

## Example Payload

```json
{
  "property_type_name": "Nha",
  "province_name": "Ha Noi",
  "district_name": "Cau Giay",
  "ward_name": "Dich Vong",
  "street_name": "Cau Giay",
  "project_name": "Unknown",
  "area": 50,
  "floor_count": 4,
  "frontage_width": 4,
  "house_depth": 12,
  "road_width": 5,
  "bedroom_count": 3,
  "bathroom_count": 3,
  "house_direction": "Unknown",
  "balcony_direction": "Unknown",
  "published_at": "2025-06-15T00:00:00"
}
```

For best model quality, use the exact Vietnamese labels from
`/metadata/options` instead of the ASCII example labels above.
