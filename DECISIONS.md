# Architecture decisions

## Domain model

`Ward` owns calendar `StaffingDay` rows (forecast demand, planned staffing, confidence). Each manual correction appends a `DemandOverride` (previous value, corrected value, justification, server-assigned user, UTC time). Effective demand is the latest remaining override, otherwise the forecast. Overrides can be deleted on editable days to undo a mistake without rewriting history in place.

Weekly summaries stay on the server: total understaffing, manual correction count, and average absolute deviation between forecast and effective demand.

## API

`GET /api/v1/staffing-weeks?weekStart=` returns every ward and seven days with effective demand, understaffing, confidence, and those summaries in one response. That avoids N+1 browser calls and keeps rules authoritative. Corrections use `POST` / `DELETE` on `/wards/{id}/staffing-days/{date}/overrides…` with shared validation: no past days, no negatives, and mandatory justification when absolute or relative deviation crosses thresholds.

## Uncertainty in the UI

Understaffing and confidence stay independent on purpose:

- staffing gap → `Short` / `Balanced` / `Surplus` (label + thin colored border);
- confidence → percent + `Low` / `Medium` / `High` in the cell footer.

Mixing them into one “risk score” would hide whether the problem is coverage or trust in the number. Corrected days keep the struck-through forecast above effective demand. A short legend dialog explains the tile on first visit.

## Frontend stack choices

Standalone Angular components, a small Signals feature store, and Reactive Forms keep the cockpit explicit. Angular Material covers dialogs, icons, and toolbar; layout and the liquid-glass look use Tailwind plus shared CSS. The grid targets tablet and desktop; audit history docks on wide screens and opens as a drawer on narrower widths.

## What we would do with more time

- optimistic concurrency on overrides;
- real authentication instead of a hard-coded audit user;
- PostgreSQL / Docker Compose for production-like deploy;
- phone-first layout polish;
- ESLint project rules and mutation testing;
- multi-browser Selenium.
