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

### R3

Retained existing four zones, all requested aggregations, percentage modes and history. Fixed cross-zone movement to be one history transaction. Chromium 100k-row CSV: real drag/drop into all four zones; count/avg/distinct/sum refresh 411/444/323/334ms from browser action through completed Worker rendering; percentage Undo/Redo passed. These measurements use a low-cardinality fixture and are not a guarantee for every matrix cardinality or phone.

### R4

Added actual SVG matrix heatmap (not just table conditional formatting). Chart click drills into retained Worker buckets; table click highlights bar/line/pie/heatmap and double-click requests complete details. Preserved optional global-filter interaction. Chromium passed four type switches and 80-record drilldown with 50-row pagination (full 80 retained). Heatmap explicitly labels its 200-group display limit. Corrected audit: baseline had table heat coloring, not a separate heatmap chart.

### R5

Chromium verified named snapshot persistence, deleting the final snapshot and reload, configuration-only share, fresh-tab empty state and restoring average aggregation after manual import. Share projection excludes dataset/record properties; links use URL fragments so configuration is not included in the initial HTTP request. Legacy query-token input remains supported.

### R6

29 Node tests passed, including Excel number-format vs UI formatter parity for positive/negative/zero, currency, percentages and unit suffixes. Chromium compared filtered/sorted CSV and formatted XLSX against rendered cells, then downloaded PNG and SVG for bar/line/pie/heatmap/funnel. PNG signatures checked; SVG is standalone without foreignObject, includes inline styles and legend. Custom funnel now renders as SVG too. Mobile PNG canvas dimensions capped at 8192 per axis; SVG remains available.

### R7

Chromium 390×844: system dark/light changes, manual override, locale switching and reload persistence, English start-page sample button, mobile horizontal table scroll and pinned first column all passed without page-width overflow. Added a centralized UI-copy dictionary; dataset field names and record values are never translated. The outer app now permits normal mobile vertical scrolling. No production localization library added.

### R8

32 Node regressions and production build passed. Chromium fault tests cover empty/unsupported/malformed/HTML inputs, missing-field warning, storage quota rejection, sparse matrix memory guard, blocking stale exports, configuration repair and Worker crash/retry. Network inspection confirmed an input sentinel never appeared in outgoing requests. Errors remain visible until dismissed. A field-statistics worker query also removes slicer/profile/filter-value scans from the main thread, including public-sheet parsing.

Final 500k Chromium replay: 8,204ms import/compute, 228 UI timer ticks; a theme action was performed during import. The initial browser harness had a 5s assertion limit for the entire 500k computation; it was corrected to 45s, separate from the 1s configuration-refresh SLA. The 100k configuration replay measured 412–603ms. Reference tests use synthetic records, not production user data.

Remaining platform verification: Chrome/Edge/Safari/iOS/Android device and OS versions vary. Local Chromium is verified; a WebKit CI job and stable Chrome acceptance are included. WebKit automation is not a substitute for real Safari/iPhone testing. OS-level process termination is outside JavaScript error handling. High-cardinality matrix and input-size guards intentionally stop unsafe workloads with advice instead of exhausting browser memory.
