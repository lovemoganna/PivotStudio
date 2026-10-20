# PivotStudio

React + Vite browser-based pivot analysis workbench.

## Running locally

```sh
npm ci
npm test
npm run dev
npm run build
```

## Actual capabilities

- Browser-side CSV/XLSX import, pivot calculations, filtering, grouping, multiple chart types and exports.
- Internal retail sample and 100k synthetic dataset are **clearly labelled demos**.
- Public Google Sheets import requests the actual selected sheet CSV. It works only when the browser is allowed to fetch the publicly accessible CSV; permission and CORS errors are shown, never silently replaced with mock rows.
- Workbook export writes a genuine XLSX with **numeric cells and complete rows** (flat headers); general charts export SVG, funnel charts PNG; PDF is available using the browser print dialog.
- Workspace view snapshots persist locally in the same browser. Share links only carry unencrypted Base64 **configuration** and do not include dataset content, access control, or cloud storage.

## Not implemented

- Database connector / SQL proxy / actual remote SQL execution.
- DuckDB-Wasm or backend query pushdown. The SQL panel produces **templates only**; pivot computation runs in JavaScript.
- Private Google OAuth and scheduled Sheets sync.
- Authentication, server-side permissions, collaborative workspace persistence and secure share links.

See [feature audit](docs/FEATURE_STATUS.md) for verification scope and known risks.

## Tests & deployment

`npm test` runs Node's built-in regression tests; GitHub Actions checks tests and Vite build. Deployment workflow tests and builds `main` to GitHub Pages. Successful deployment requires repository Pages settings and Actions permissions to be configured in GitHub.

