# PivotStudio capability audit · 2026-10-19

| Function | Status | Verification / limitation |
| --- | --- | --- |
| Local CSV/XLSX import | Implemented; needs browser regression | Multiline quoted CSV parser, type inference, workbook sheet selection |
| Pivot aggregation | Implemented; tests added | SUM/AVG/MIN/MAX/COUNT/DISTINCT and grouping; further edge tests needed |
| Charts and drill-down | Implemented; needs browser regression | Recharts, linked interaction |
| Excel export | Implemented; needs browser regression | Native XLSX from DOM table; check complex merged headers |
| CSV/SVG/PNG/print | Implemented; needs browser regression | PNG only for funnel, SVG for other charts, PDF via print |
| Public Google Sheets | Real fetch path; environment-dependent | Public CSV access and browser CORS must permit request; errors shown |
| Database SQL proxy | Not implemented | Button and false success responses removed |
| DuckDB query execution | Not implemented | Only copyable SQL templates |
| 100k data simulation | Implemented | Synthetic local records; no DuckDB runtime or performance guarantee |
| Saved workspaces | Local only | Browser localStorage configuration snapshots; not cloud-backed |
| Share link | Partial | View config only, unencrypted Base64, same dataset required |
| Roles | Demo only | UI toggles are not authentication or authorization |

## Known issues / next work

1. Run actual browser interaction and responsive-layout regression across viewport sizes. Static source inspection and CI build do not establish production-level UX quality.
2. Harden spreadsheet types, null semantics, CSV formula injection, malformed rows and large-file error handling.
3. Measure 100k+ row compute time, memory and UI blocking. Consider Web Worker and/or DuckDB-Wasm based on numbers, not a UI badge.
4. Verify live Google Sheets CSV with a public test sheet from the deployed origin; no cross-origin bypass is implemented.
5. Add a secure backend before claiming database support, authentication, sharing or collaborative persistence.
6. Complete a11y review, including dialog focus management and keyboard interactions.

## Evidence rules

Do not mark a function implemented because a button exists or a mock success toast appears. Claims of successful testing require build logs, test outputs or browser execution evidence.
