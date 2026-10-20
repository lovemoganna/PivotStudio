# R1–R8 implementation and acceptance

Baseline: main `5100d97`. All datasets and calculations stay in the browser. No production dependency added.

## Baseline audit

| Requirement | Existing | Gap to implement |
|---|---|---|
| R1 | Aggregation Worker for >2,500 rows, table virtualization | Main-thread parsing, unsafe synchronous fallback, no cancellation or computation progress |
| R2 | 20-row preview, manual number/date/text/boolean types | UTF-8 only; comma and first-line headers assumed |
| R3 | Four drag/drop zones, sum/count/avg/distinct, percentage display, 30-step history | Measure 100k config refresh; retain existing interaction |
| R4 | Bar/line/pie/heatmap, chart-to-table highlight, cell double-click details | Unify single-click highlight vs chart drilldown; worker details unavailable after bucket stripping |
| R5 | Local named snapshots and configuration-only links | Cannot delete last snapshot; restored config overwritten by data load |
| R6 | Genuine XLSX and CSV, SVG for standard charts, PNG for funnel | Both image formats for all charts; numeric format parity |
| R7 | Mobile horizontal scrolling, sticky headers, manual theme, sample presets | System theme and English localization |
| R8 | React ErrorBoundary, some validation toasts | Explicit actionable errors, worker crashes, storage failure, async errors |

## Validation evidence

Results are added per requirement; untested browsers are not claimed as verified.

### R1

- 24 Node regression tests passed; build passed.
- Actual Chromium 153: 500,000-row CSV preview → confirmed import → pivot; 10,624ms wall time, 267 UI timer ticks, theme toggle and table verified; import cancellation passed.
- Actual Worker module in Node bridge: 500k totals correct, 103 progress events, termination tested. No main-thread fallback on worker failure.
- Fixed pre-existing calendar-date UTC parsing error exposed by baseline tests outside UTC+8.

### R2

27 Node tests passed. Chromium end-to-end verified GBK Chinese, semicolon detection, header override with row-count changes, field override, TSV and exactly 20 preview rows. Numeric/date/boolean inference and leading-zero identifier preservation tested. Ambiguous all-text headers default to present; users can correct explicitly. Excel header handling remains explicit. Added `@playwright/test` as development-only dependency for reproducible browser acceptance (zero new production dependencies).
