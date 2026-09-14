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
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

Example weekly endpoint:

```bash
curl "http://localhost:8000/api/v1/staffing-weeks?weekStart=2026-09-14"
```

Create a demand override:

```bash
curl -X POST "http://localhost:8000/api/v1/wards/{wardId}/staffing-days/2026-09-16/overrides" \
  -H "Content-Type: application/json" \
  -d '{"correctedDemand":20,"justification":"Two additional high-acuity admissions expected"}'
```

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

The Angular dev server proxies `/api` to `http://localhost:8000`.

## Tests

```bash
# Backend
cd backend
source .venv/bin/activate
pytest --cov=app --cov-report=term-missing
ruff check app tests
mypy app

# Frontend
cd frontend
npm test -- --coverage --watchAll=false
npx tsc -p tsconfig.app.json --noEmit

# E2E (requires running frontend + backend with test reset enabled)
cd backend
DAPHOS_ALLOW_TEST_RESET=true uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# in another terminal
cd frontend && npm start

# in another terminal
cd e2e
npm install
npm test
```

Reset seed only:

```bash
cd backend
source .venv/bin/activate
python -m app.seed --reset
```

## Forecast data

Forecast values come from a deterministic generated seed dataset (`python -m app.seed`).
The generator uses a fixed random seed and dates relative to the current ISO week in
`Europe/Berlin`. No trained model is used.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the required implementation plan and [NICE_TO_HAVE.md](./NICE_TO_HAVE.md) for optional follow-ups such as Stryker and Docker.
