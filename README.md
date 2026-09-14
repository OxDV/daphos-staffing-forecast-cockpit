# DaphOS Staffing Forecast Cockpit

Fullstack coding challenge for reviewing and correcting hospital ward staffing demand forecasts.

## Repository layout

```text
codingChallenge/
├── frontend/   # Angular + TypeScript
├── backend/    # FastAPI + SQLite
├── ARCHITECTURE.md
├── NICE_TO_HAVE.md
└── task.md
```

## Prerequisites

- Node.js 20+
- Python 3.11+
- npm

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

Health checks:

- http://localhost:8000/health/live
- http://localhost:8000/health/ready

## Frontend

```bash
cd frontend
npm install
npm start
```

App: http://localhost:4200

## Tests

```bash
# Backend
cd backend
source .venv/bin/activate
pytest --cov=app --cov-report=term-missing

# Frontend (default Angular unit runner for now)
cd frontend
npm test -- --watch=false --browsers=ChromeHeadless
```

## Forecast data

Forecast values will come from a deterministic generated seed dataset. No trained model is used.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the required implementation plan and [NICE_TO_HAVE.md](./NICE_TO_HAVE.md) for optional follow-ups such as Stryker and Docker.
