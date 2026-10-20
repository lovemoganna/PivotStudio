# PivotStudio

React + Vite browser-based pivot analysis workbench.

## Running locally

```sh
npm ci
npm test
npm run dev
npm run build
# Browser acceptance (development only)
npx playwright install chromium webkit
npm run test:browser
```

## Actual capabilities

- Browser-local Worker CSV/TSV/XLSX import and pivot calculations, visible progress, cancellation, filtering, grouping and linked charts. UTF-8/GBK, delimiter/header detection and manual preview overrides are included.
- Internal retail sample and 100k synthetic dataset are **clearly labelled demos**.
- Public Google Sheets import requests the actual selected sheet CSV. It works only when the browser is allowed to fetch the publicly accessible CSV; permission and CORS errors are shown, never silently replaced with mock rows.
- XLSX and CSV export the full filtered/sorted result with number formats. Charts, including heatmaps and funnels, export PNG and SVG. PDF uses the browser print dialog.
- Workspace view snapshots persist locally in the same browser. Share links only carry unencrypted Base64 **configuration** in a URL fragment and do not include dataset content, access control, or cloud storage.

## Not implemented

- Database connector / SQL proxy / actual remote SQL execution.
- DuckDB-Wasm or backend query pushdown. The SQL panel produces **templates only**; pivot computation runs in JavaScript.
- Private Google OAuth and scheduled Sheets sync.
- Authentication, server-side permissions, collaborative workspace persistence and secure share links.

See [feature audit](docs/FEATURE_STATUS.md) for verification scope and known risks.

## Tests & deployment

`npm test` runs Node's built-in regression tests; GitHub Actions checks tests and Vite build. Deployment workflow tests and builds `main` to GitHub Pages. Successful deployment requires repository Pages settings and Actions permissions to be configured in GitHub.


System/manual themes and Chinese/English UI are available. Files never upload to a server. Resource guards and detailed validation evidence are documented in [R1–R8 acceptance](docs/R1-R8-ACCEPTANCE.md).
