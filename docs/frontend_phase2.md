# Frontend Phase 2

The "Dự đoán giá nhà Hà Nội" React frontend lives in `frontend/` and consumes the FastAPI backend
from phase 1.

## Stack

- React + TypeScript + Vite
- React Router
- Framer Motion
- Three.js through React Three Fiber
- Recharts
- Lucide icons

## Routes

- `/`: cinematic landing page, live valuation demo, and product capabilities
- `/dashboard`: real valuation workspace backed by FastAPI

The dashboard keeps the trained model, market benchmark, comparable listing,
reference range, and optional deal score flows. Model confidence is displayed
separately from the market Q25-Q75 range and is derived from validation MAE.

## Run

Start the FastAPI backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

Vite proxies `/api` to `http://127.0.0.1:8000` during local development.

## Environment

Copy `frontend/.env.example` to `frontend/.env` when the API is served from a
different origin:

```text
VITE_API_BASE_URL=https://api.example.com
```

## Checks

```powershell
cd frontend
npm run lint
npm run build
npm run test:visual
```

The visual test uses local Microsoft Edge in headless mode. It checks:

- FastAPI data is visible in the UI
- the WebGL canvas renders nonblank pixels
- property analysis submit succeeds
- scroll chapters switch correctly
- market, comparable, and deal tabs work
- desktop and mobile screenshots render
- mobile has no horizontal page overflow
- console and page errors remain empty

Screenshots are written to the operating system temporary directory under
`hanoi-home-value-qa`.
