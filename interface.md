# UI notes

The cockpit uses Angular Material for interactive controls:

- `mat-toolbar` week navigation
- `mat-card` sidebars and grid shell
- `mat-dialog` demand correction
- `mat-form-field` / `matInput` override form
- `mat-list` audit history and ward links
- Material icons for staffing status markers

Tailwind is limited to layout spacing for the weekly grid. Status colors remain lightweight CSS so Short / Surplus / Low-confidence stay visible independently of Material theme tokens.

Stable selectors for tests remain on `id` and `data-testid` attributes.
