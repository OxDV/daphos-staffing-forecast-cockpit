# DaphOS Staffing Forecast Cockpit

Fullstack take-home for reviewing and correcting hospital ward staffing demand forecasts.

## Repository layout

```text
codingChallenge/
├── frontend/        # Angular + Angular Material + Tailwind layout
├── backend/         # FastAPI + SQLAlchemy + SQLite
├── e2e/             # Selenium WebDriver + Jest
├── ARCHITECTURE.md  # Implementation plan
├── DECISIONS.md     # Brief architecture decisions for submission
├── NICE_TO_HAVE.md  # Optional follow-ups
└── task.md          # Original brief
```

## Prerequisites

- Node.js 20+
- Python 3.11+
- Chrome (for Selenium E2E)

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs: http://127.0.0.1:8000/docs

Health:

- http://127.0.0.1:8000/health/live
- http://127.0.0.1:8000/health/ready

Reset the deterministic dataset:

```bash
python -m app.seed --reset
```

## Frontend

```bash
cd frontend
npm install
npm start
```

App: http://127.0.0.1:4200

The Angular dev server proxies `/api` to `http://127.0.0.1:8000`.

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
npm run typecheck
npm run lint:format

# E2E (frontend + backend must be running)
cd backend
DAPHOS_ALLOW_TEST_RESET=true uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# another terminal
cd frontend && npm start

# another terminal
cd e2e
npm install
npm test
```

## Forecast data

Forecast values come from a deterministic generated seed (`python -m app.seed`).
The generator uses a fixed random seed and dates relative to the current ISO week in
`Europe/Berlin`. No trained model is used. The seed spans five weeks (one past, current,
three future) for three wards and includes one pre-seeded override for audit history.

## Architecture summary

See [DECISIONS.md](./DECISIONS.md) for the one-page submission write-up and
[ARCHITECTURE.md](./ARCHITECTURE.md) for the full implementation plan.

## Unfinished / deferred

Intentionally out of scope or deferred:

- authentication (hard-coded audit user is used);
- optimistic concurrency;
- PostgreSQL / production deployment;
- ESLint project config;
- Stryker mutation testing;
- Docker Compose;
- multi-browser Selenium.
