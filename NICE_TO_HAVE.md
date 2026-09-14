# DaphOS Staffing Forecast Cockpit — Nice to Have

These improvements are intentionally outside the required implementation path. They should be added only after the complete user flow, required tests, and submission documentation are finished.

## Priority 1 — Focused StrykerJS demonstration

Mutation testing should target a small set of critical pure functions:

- conditional justification validator;
- staffing status calculation;
- confidence band calculation.

Useful boundary mutants include:

- changing `>= 2` to `> 2`;
- changing `>= 0.2` to `> 0.2`;
- changing `max(demand - staffing, 0)` arithmetic;
- changing confidence-band boundaries.

Exclude:

- Angular bootstrap;
- configuration files;
- templates and styles;
- type declarations;
- API transport models;
- E2E tests.

Provide:

```text
npm run test:mutation
```

Generate an HTML report and briefly explain in the README which meaningful mutants are killed. Do not enforce a repository-wide mutation threshold.

Backend mutation testing is unnecessary for this timeboxed submission.

## Priority 2 — Lightweight Docker Compose

Docker is optional reviewer convenience, not the primary development workflow.

One command should start the application:

```text
docker compose up --build
```

Suggested services:

- Angular frontend;
- FastAPI backend;
- named volume for SQLite persistence.

The backend container can apply migrations and seed an empty database before starting Uvicorn. The frontend proxies `/api` to the backend.

Native commands must remain documented because they are faster to debug and do not require Docker.

Do not add:

- Kubernetes;
- multiple Compose profiles;
- a separate database container for SQLite;
- a reverse proxy unless required by the chosen production-style frontend image;
- containerized test runners unless they simplify reviewer setup.

## Priority 3 — Additional quality improvements

- Accessibility audit with axe.
- Responsive mobile ward cards.
- Better empty and partial-data states.
- OpenAPI-generated TypeScript client.
- API contract drift check.
- Multi-browser Selenium execution.

## Production improvements

These are discussion points for the follow-up interview, not challenge requirements:

- authentication and ward-level authorization;
- optimistic concurrency to prevent lost updates;
- idempotency protection for override creation;
- PostgreSQL for concurrent workloads;
- structured logs and request correlation IDs;
- configurable domain thresholds;
- pagination or filtering for large ward lists;
- monitoring and production health checks.

## Stop rule

Do not start a nice-to-have item while any of the following is incomplete:

- weekly cockpit;
- week navigation;
- risk visualization;
- correction validation and persistence;
- visible audit history;
- weekly summaries;
- full Jest coverage;
- full pytest coverage;
- Selenium feature scenarios;
- README setup instructions;
- one-page architecture summary.
