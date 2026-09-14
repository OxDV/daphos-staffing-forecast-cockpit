# Architecture decisions

## Domain model

`Ward` owns calendar `StaffingDay` rows. Forecast demand, planned staffing, and confidence stay on the day record. Each manual correction creates a `DemandOverride` (previous demand, corrected demand, justification, server-assigned user, UTC time). Effective demand is the latest remaining override, or the forecast if none exist. Overrides can be deleted on editable days so a mistaken correction can be undone without rewriting history rows in place.

## API

`GET /api/v1/staffing-weeks?weekStart=` returns every ward and seven days with effective demand, understaffing, confidence, and weekly summaries computed on the server. That avoids N+1 browser calls and keeps rules authoritative. Corrections use `POST` / `DELETE` on `/wards/{id}/staffing-days/{date}/overrides…` with the same validation policy the UI mirrors for quick client-side feedback.

## Uncertainty in the UI

Understaffing and confidence stay independent:

- staffing gap → `Short` / `Balanced` / `Surplus` (label + thin colored border);
- confidence → percent + `Low` / `Medium` / `High` in the cell footer.

Corrected days keep the struck-through forecast above effective demand. A short legend dialog explains the tile on first visit.

## Frontend stack choices

Standalone Angular components, a small Signals feature store, and Reactive Forms keep the cockpit explicit. Angular Material covers dialogs, icons, and toolbar; layout and the liquid-glass look use Tailwind plus shared CSS. The grid targets tablet and desktop; audit history docks on wide screens and opens as a drawer on narrower tablet widths.

## What we would do with more time

- optimistic concurrency on overrides;
- real authentication instead of a hard-coded audit user;
- PostgreSQL and Docker Compose for one-command review;
- phone-first layout polish;
- ESLint project rules and mutation testing;
- multi-browser Selenium.
