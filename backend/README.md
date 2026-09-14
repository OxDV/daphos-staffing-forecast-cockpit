# Backend

FastAPI service for the DaphOS Staffing Forecast Cockpit.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Test

```bash
pytest --cov=app --cov-report=term-missing
```
