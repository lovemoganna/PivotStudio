# Release and business-data validation · 2026-10-21

## Authorized sequence and release evidence

1. Reviewed PR #7 and its three unresolved inline findings. Fixed raw Excel numbers and recovery after corrupt workspace storage; added a regression for the already-correct rejected cross-zone move. 32 Node tests, production build, 25 Chromium tests and candidate mobile/desktop import → filter → chart drilldown → CSV export passed.
2. [PR #7](https://github.com/lovemoganna/PivotStudio/pull/7) merged as `2cd5dd092066581d062882b48f5f1ae77e09941b` after [CI 39554984100](https://github.com/lovemoganna/PivotStudio/actions/runs/39554984100) passed Chromium 25/25, WebKit 25/25, legacy smoke and UI/axe checks. [Pages deployment 39555585227](https://github.com/lovemoganna/PivotStudio/actions/runs/39555585227) succeeded. The live page's asset hashes matched the candidate build. Actual online 360px touch-emulation and 1440px desktop flows passed: two selected fixture rows, total 30, no page exceptions/non-GET requests/document overflow. These mechanical checks use an explicit synthetic three-row fixture.
3. Then imported three public actual business datasets on the live release, compared aggregates with an independent Python oracle, fixed the reproducible semantic issues below and repeated the checks locally. Final follow-up CI/deployment status is reported separately; no pending check is implied to have passed here.

Online Chromium initially failed direct network access and then proxy certificate validation. The successful runs used the environment HTTPS proxy and an explicit test-context `DELIVERY_IGNORE_HTTPS_ERRORS=1`; normal Python HTTPS fetches verified the live page. This is a test-environment limitation, not a claim about end-user certificate trust.

## Public sources and exact scope

| Dataset | Imported file | Scope | Independent filter/oracle |
| --- | --- | --- | --- |
| [Chen, Online Retail, UCI](https://archive.ics.uci.edu/dataset/352/online+retail) | XLSX, eight columns | First 2,000 source worksheet records, original headers/cell values; not all 541,909 records | Country=United Kingdom, 1,841 rows, SUM(Quantity)=15,535 |
| [Moro, Rita & Cortez, Bank Marketing, UCI](https://archive.ics.uci.edu/dataset/222/bank+marketing) | Original semicolon-delimited bank-full.csv | Complete 45,211 rows | job=management, 9,458 rows, SUM(balance)=16,680,288 |
| [Sakar & Kastro, Online Shoppers Purchasing Intention, UCI](https://archive.ics.uci.edu/dataset/468/online+shoppers+purchasing+intention+dataset) | Original comma-delimited CSV | Complete 12,330 sessions | Month=May, 3,364 rows, AVG(BounceRates)=0.02686660742627824019024970273 |

Sources are public UCI datasets attributed above under their source CC BY 4.0 licenses. [Download URLs, SHA-256 digests, sample scope and expected results](quality-evidence/business-sources.json) make the input provenance inspectable. No raw source files or transactions are committed. These are public datasets, not the user's private business files.

## Findings, repairs and regression risks

| Priority / reproduction | Before | Root repair and expected behavior |
| --- | --- | --- |
| P1: import the retail XLSX and accept recommendations | InvoiceNo/StockCode/CustomerID inferred numeric; mixed stock codes such as 85123A became null after normalization; InvoiceNo and StockCode were default SUM metrics | Shared identifier-name detection preserves strings and excludes IDs from implicit numerical recommendations; explicit user role/type choices remain available. Default metrics become Quantity/UnitPrice. |
| P1: inspect the first retail timestamp after import in a non-UTC browser | 08:26 became 13:26 through timezone-bearing Date serialization | Decode formatted Excel date serials directly, including the workbook 1904 calendar flag, into timezone-free ISO wall-clock text; round floating fractional seconds to milliseconds. Keep 08:26, preserve raw currency/percent numbers. |
| P1: accept shopper recommendations | Administrative_Duration matched the substring `ratio`, became AVG and a percentage | Match ratio/rate as name words, including camel-case words. Duration is numerical SUM with no invented unit. |
| P1: show the May bounce-rate average as a percentage | The formatter could show 0.03% for a fraction near 0.0269 | Ordinary percentage formats multiply source fractions by 100; show-as percentages already scaled by the engine are not multiplied twice. Native XLSX percentage formatting keeps the underlying fraction numeric. Correct display: 2.69%. |
| P1: a monetary/time measure without explicit unit metadata | Generic Price/Amount/Duration names could imply CNY/ms, regardless of source units | Use explicit format/field currency or explicit unit suffixes/brackets; do not invent physical/currency units from generic names. The UCI retail source is GBP. |

The changes affect type inference, initial recommendations and formatted values. Raw aggregation formulas, user filters/sorting and explicit saved configurations remain intact. Existing views with incorrect manually selected aggregations/units still require correction by the owner; percentages now follow standard fraction semantics, while show-as percentages preserve their previous engine scale. No production dependency was added. The optional preparation script uses Python's already-available openpyxl for independent XLSX reading, outside the application bundle.

## Executed follow-up validation

- 35/35 Node tests and production build passed. Unit coverage includes mixed identifiers, explicit currency metadata, duration/rate word boundaries, ordinary vs show-as percentages and numeric XLSX-format equality.
- Full Chromium suite: 25/25 passed. Includes R1–R8, readable panes at 360/768/1280/1440px, keyboard/focus/touch targets and selected axe rules. Excel regression now uses fixed numerical date serials, avoiding timezone-dependent test-fixture generation.
- All three candidate business files passed actual browser import with 20-row preview, default configuration inspection, filtered aggregation vs Python csv/openpyxl + Decimal, table/CSV/XLSX equality, original-row chart drilldown and bar/line/pie/heatmap switching. Retail detail preserves `85123A` and `2010-12-01T08:26:00.000`.
- XLSX retains the precise shopper average `0.026866607426278433` (floating-point difference from the Decimal oracle below 1e-8), while table/CSV/XLSX display 2.69%. No browser page exceptions or non-GET requests were observed.
- [Before](quality-evidence/business-before.json) and [after](quality-evidence/business-after.json) preserve actual types, default bindings, totals and test results. Original baseline aggregate checks passed despite the identified recommendation/display defects; that distinction is retained.

Failed exploratory checks are not hidden: an initial drilldown expectation incorrectly assumed thousands separators in the row-count badge; a first fixed-date regression used JS Date-based workbook fixture generation, which writes a local-time Excel serial, and was replaced with an explicit serial. Initial online direct/proxy-certificate connection failures are noted above.

## Reproduction

```bash
python scripts/prepare-business-data.py
CHROME_BIN=/path/to/chrome node scripts/business-data-audit.mjs
DELIVERY_URL=https://lovemoganna.github.io/PivotStudio/ BUSINESS_EXPECT_FIXED=1 CHROME_BIN=/path/to/chrome node scripts/business-data-audit.mjs
DELIVERY_URL=https://lovemoganna.github.io/PivotStudio/ CHROME_BIN=/path/to/chrome node scripts/delivery-smoke.mjs
```

The scripts write source archives, manifest, JSON results and functional screenshots to ignored `artifacts/`. Python preparation requires openpyxl; npm application dependencies are unchanged. Set the HTTPS-ignore flag only where the testing proxy requires it; it defaults off. Original business rows stay inside the browser during product checks.

## Limits and stopping condition

Physical iPhone/Android, installed Edge/Safari and external screen readers were not operated. Touch emulation and CI WebKit are explicitly narrower checks. Private user CSVs, the complete retail workbook, arbitrary schema semantics, all locale encodings and actual OS out-of-memory termination are unverified. Numeric category codes without recognizable ID names can require manual type/role correction. Header/type inference remains heuristic; 20-row preview and manual correction remain essential. No general data-correctness certification or unconditional one-second performance guarantee is claimed.

This follow-up stops after the reproducible P1/P2 issues above are fixed, original browser regressions pass and the three bounded datasets match independent calculations. No unsupported visual restyling or additional speculative changes are included. Core modified files: `src/utils/{csvParser,fieldSemantics,formatters,exportMatrix}.js`, `src/constants/pivotConstants.js`, `src/features/pivot/{PivotWorkbench.jsx,engine/importWorker.js}`, matching tests, validation scripts and these evidence documents.
