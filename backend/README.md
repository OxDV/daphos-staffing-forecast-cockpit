# Backend

FastAPI service for the DaphOS Staffing Forecast Cockpit.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Database

```bash
alembic upgrade head
python -m app.seed
```

The seed generates a deterministic five-week dataset relative to the current Europe/Berlin date:
one past week, the current week, and three future weeks. Forecast values are synthetic.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Test

```bash
pytest --cov=app --cov-report=term-missing
```
