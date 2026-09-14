# Architecture decisions

## Domain model

`Ward` owns calendar `StaffingDay` records. The generated forecast, planned staffing, and confidence stay immutable on the day. Every manual correction creates an append-only `DemandOverride` with previous demand, corrected demand, justification, server-assigned user, and UTC timestamp. Effective demand is the latest correction or the original forecast. This preserves the forecast trail and makes audit history trivial to reconstruct.

## API

One weekly read endpoint returns every ward and seven days with derived effective demand, understaffing, and summaries. That avoids N+1 browser requests and keeps calculation rules authoritative on the server. Overrides use a separate `POST` endpoint with the same validation policy the UI mirrors for fast feedback.

## Uncertainty in the UI

Understaffing and forecast confidence are independent signals:

- staffing balance is `Short`, `Balanced`, or `Surplus`;
- confidence is a percentage plus `Low` / `Medium` / `High`.

Day cells use Material buttons/icons plus light status borders. Low confidence adds a subtle hatch so uncertainty remains visible even when staffing is balanced.

## Frontend stack choices

Standalone Angular components, Signals store, and typed Reactive Forms keep the feature small and explicit. Angular Material provides dialog, form fields, toolbar, cards, and lists so interaction patterns stay accessible without a large custom design system. Tailwind remains only for layout spacing and the weekly grid.

## What we would do with more time

- optimistic concurrency on overrides;
- real authentication instead of a hard-coded audit user;
- PostgreSQL for multi-user deployments;
- ESLint + Stryker mutation testing;
- Docker Compose for one-command reviewer startup;
- multi-browser Selenium execution.
