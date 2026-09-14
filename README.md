# DaphOS Staffing Forecast Cockpit

Fullstack take-home: ward managers review a weekly staffing demand forecast, spot understaffing and low-confidence days, and correct demand with an auditable history.

**Branch to review:** [`staging`](https://github.com/OxDV/daphos-staffing-forecast-cockpit/tree/staging)  
(`main` only contains the initial scaffold.)

## What the app does

- Browse wards week by week (past + current + future weeks in the seed)
- See forecast demand, planned staffing, confidence, and Short / Balanced / Surplus at a glance
- Correct editable days with validation (no past days, no negatives, justification when deviation is large)
- Inspect audit history (who / when / why); delete corrections on editable days
- Per-ward week summary: total understaffing, correction count, average absolute deviation

## Stack

| Layer    | Choice                                      |
| -------- | ------------------------------------------- |
| Frontend | Angular 20, Signals, Angular Material, Tailwind layout |
| Backend  | FastAPI, SQLAlchemy, Alembic, SQLite        |
| Tests    | pytest, Jest, Selenium WebDriver E2E        |

## Repository layout

```text
.
├── start.sh         # Install deps + start backend & frontend
├── frontend/        # Angular cockpit
├── backend/         # FastAPI API + SQLite
├── e2e/             # Selenium + Jest scenarios
├── DECISIONS.md     # One-page architecture decisions (submission)
├── README.md        # Setup and forecast data note
└── task.md          # Original brief
```

## Prerequisites

Install these once on the machine (the script does not install system packages):

- Node.js 20+
- Python 3.11+
- `curl` (used for health checks)
- Chrome (only for Selenium E2E)

## Quick start

Clone the repo, switch to **`staging`**, then run one script:

```bash
git clone https://github.com/OxDV/daphos-staffing-forecast-cockpit.git
cd daphos-staffing-forecast-cockpit
git checkout staging
./start.sh
```

`./start.sh` will:

1. Create `backend/.venv` if missing
2. Install backend deps (`pip install -e ".[dev]"`)
3. Run Alembic migrations and seed data
4. Run `npm install` in `frontend/` if `node_modules` is missing
5. Start the backend, wait for `/health/ready`, then start the frontend
6. Print links to the app and API

Ctrl+C stops both services.

Printed URLs:

- App (frontend): http://127.0.0.1:4200
- API docs: http://127.0.0.1:8000/docs
- Backend health: http://127.0.0.1:8000/health/ready

Frontend `/api` is proxied to `http://127.0.0.1:8000`.

### Manual start (optional)

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Frontend (another terminal)
cd frontend && npm install && npm start
```

Reset seed data:

```bash
cd backend && source .venv/bin/activate
python -m app.seed --reset
```

## Forecast data

Values are **not** from a trained model. A deterministic generator (`python -m app.seed`) builds five ISO weeks (one past, current, three future) for wards **B3**, **ICU**, and **A2**, using a fixed RNG seed and dates relative to “today” in `Europe/Berlin`. Several seeded corrections populate audit history for demos.

## Tests

```bash
# Backend
cd backend && source .venv/bin/activate
pytest
ruff check app tests
mypy app

# Frontend
cd frontend
npm test -- --watchAll=false
npm run typecheck

# E2E (backend + frontend must already be running)
cd backend
DAPHOS_ALLOW_TEST_RESET=true uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
# other terminal: cd frontend && npm start
cd e2e && npm install && npm test
```

The brief asks for a small, deliberate test selection; this repo also includes broader unit coverage and four Selenium scenarios.

## Architecture decisions

See **[DECISIONS.md](./DECISIONS.md)** (one page, as required by the brief).

## Out of scope / deferred

- Real authentication (hard-coded audit user)
- Optimistic concurrency
- PostgreSQL / Docker Compose / production deploy
- Phone-first layout (tablet + desktop focused)
- Multi-browser Selenium
