# DaphOS Staffing Forecast Cockpit — Interface

Liquid-glass visual language for the Angular cockpit. Implement progressively by architecture step. Do not build later-step UI early.

## Design tokens

```css
--ink: #1a2332;
--ink-soft: #5b6b7c;
--ink-faint: #8b9aab;
--accent: #2f6fed;
--accent-ink: #f5f8ff;
--short: #c43c3c;
--surplus: #1f7a4c;
--balance: #5b6b7c;
--line: rgba(26, 35, 50, 0.12);
--glass-bg: rgba(255, 255, 255, 0.55);
--glass-soft: rgba(255, 255, 255, 0.35);
--page-bg: radial gradients over cool slate/blue wash;
```

Shared surface classes:

- `.glass` — frosted panel (`backdrop-filter`, soft border, rounded-2xl)
- `.glass-soft` — lighter tile surface for day cells
- `.font-display` — compact semibold UI titles
- `.font-mono` — tabular numeric values

Accessibility rules:

- never rely on color alone;
- prefer text labels and Material/SVG icons over emoji;
- maintain WCAG AA contrast on glass surfaces;
- every interactive control needs a visible focus ring.

Selector rules:

- stable `id` and `data-testid` for unique controls;
- semantic `class` names for structure and state modifiers;
- prefer `data-ward-code` and `data-date` for day cells.

## Layout

Desktop:

1. Left aside (`#ward-sidebar`) — brand + ward list
2. Main (`#forecast-main`) — week navigation + ward/day grid
3. Right aside (`#audit-sidebar`) — audit history for the selected day

Mobile:

- hide sidebars;
- keep week navigation and a horizontally scrollable day grid.

## Step 4 — Weekly cockpit shell

Goal: browse seeded weeks and see wards with seven days.

Include:

- `#forecast-cockpit` page shell with glass layout
- `#week-navigation` previous / next / current week label
- URL state `?week=YYYY-MM-DD` (Monday)
- `#ward-sidebar` list of wards from the loaded week
- `#ward-week-grid` rows for each ward and seven day tiles
- day tile content for this step only:
  - effective demand
  - planned staffing as `/ planned`
  - confidence percent
  - locked appearance when `canOverride === false`
- `#ward-week-summary-*` summary values from the API
- loading, error (with retry), and empty states

Do not include yet:

- `Short` / `Balanced` / `Surplus` labels
- confidence band labels
- override dialog
- live audit history panel content beyond an empty placeholder

Example selectors:

```text
#forecast-cockpit
#week-navigation
#week-previous-button
#week-next-button
#week-range-label
#ward-sidebar
#ward-week-grid
#day-cell-{wardCode}-{date}
.staffing-day-cell
.staffing-day-cell--locked
#cockpit-loading-state
#cockpit-error-state
#cockpit-empty-state
```

## Step 5 — Risk visualization

Enhance day tiles:

- staffing status: `Short N`, `Balanced`, `Surplus N`
- independent confidence band: `Low` / `Medium` / `High`
- corrected marker and struck-through original forecast
- state classes:
  - `.staffing-day-cell--short`
  - `.staffing-day-cell--balanced`
  - `.staffing-day-cell--surplus`
  - `.staffing-day-cell--low-confidence`
  - `.staffing-day-cell--medium-confidence`
  - `.staffing-day-cell--high-confidence`
  - `.staffing-day-cell--corrected`

Low confidence uses a hatch pattern in addition to the text label so color is never the only signal.

## Step 6 — Backend only

No frontend UI in this step.

## Step 7 — Override and history UI

Add:

- `#override-dialog` typed form for corrected demand + justification
- disable edit for locked/past days with explanation
- update day tile and ward summary after save
- `#audit-sidebar` / `#override-history-dialog` showing who / when / what / why

## Motion

Keep motion subtle:

- panel fade/rise on first load (`.rise`)
- no distracting loops
- instant feedback on week navigation loading state

## Copy

All UI text is English.

Examples:

- `Locked · past`
- `Total understaffing`
- `Corrections`
- `Avg abs dev`
- `Select a day to view audit history`
- `Unable to load staffing week`
- `Retry`
