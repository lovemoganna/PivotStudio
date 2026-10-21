# UI Quality Loop — 2026-10-20–21

Scope: improve PR #7 without changing React/Vite/Recharts, pivot calculations, local-only data handling or the Monokai design language. Baseline: local `db2986d`, same source tree as remote `eb44f7f`.

## Evidence and environment

`CHROME_BIN=/tmp/pivot-chromium AUDIT_PHASE=before node scripts/quality-audit.mjs` captured the actual built-in retail demo at 360, 768, 1280 and 1440 CSS pixels, height 900, both themes, and actual file-import previews. English screenshots use the real locale, not replacement UI. The initial host had no CJK fonts. Those exploratory captures are not the final visual evidence. Final baseline and candidate captures both use the same local Noto Sans SC 400/500/600/700 font files through a browser test route. Raw Chinese demo field names and values remain unchanged. Remote fonts are blocked consistently and reduced motion is enabled.

The metrics record actual geometry, runtime errors, and unnamed preview controls. `tiny` is a diagnostic count including native checkboxes, not an automated WCAG violation count. The initial optional axe install failed; after environment restoration it succeeded. The final runner uses @axe-core/playwright 4.14 as a dev dependency. Production dependencies and data-processing code are unchanged. Only labelled demo/fixture rows are used in tests.

## Findings, repairs and acceptance

| ID | Priority / affected task | Evidence / reproduce | Expected / root cause | Repair / regression surface |
|---|---|---|---|---|
| Q1 | P1 / reading and drilling into results | Load retail demo in split view at 768×900: table scroll viewport is 0px. At 1280 it is 106px, leaving almost no body space below headers/total. Chart wrapper is 160px at every baseline width. | Keep data readable when controls and panes cannot fit; percentage-only allocation and shrinkable plot ignore minimum content space. | Shared workspace scrolls; split table minimum 480px, chart 460px, plot minimum 260px. Existing split ratios still respect content minima. Table/chart-only, fullscreen, printing and splitter are regression surfaces. |
| Q2 | P1 / keyboard import | Intro upload surface is a clickable div absent from the keyboard tab order. | Enter/Space should open the same local file chooser as a mouse click. | Named button role, focusability, Enter/Space handling and read-only disabled semantics; drag/drop path retained. |
| Q3 | P2 / identifying controls and long fields | Every import preview has two unnamed type selects in the two-field fixture. Chart settings labels precede selects without semantic association. | Screen readers must identify each field and control; long identifiers should remain readable. | Name field-type selects with full original field name, wrap field/file names, label chart settings and command search. No field data is translated. |
| Q4 | P2 / readability and pointer precision | Neon cyan text #66D9EF on #FFFDF7 is 1.62:1; green 1.52:1; pink 3.72:1. Dense controls have sides below 24px. | Small text needs 4.5:1 on its surface, and controls need sufficient targets. | Shared semantic foreground tokens, darker primary action fill, 24px minimum buttons/selects (32px on coarse pointers). Existing chart-series colors remain unchanged. Check layout and exports after shared-style changes. |
| Q5 | P2 / mobile table reading | 360px baseline screenshot shows multiple wrapped display-tool rows before any data. | Secondary display settings should not displace the primary data by default. | Mobile-only named disclosure; desktop controls stay visible; state survives collapsing and resizing. Slicer and data remain directly available. |

## Verified user flow

1. Empty state → keyboard file chooser → preview: keyboard labels, focus containment/return and long names checked.
2. Preview → typed import → Worker calculation: original R1–R8 acceptance checks parsing, progress, cancellation and recoverable errors.
3. Configure → table highlight → chart drilldown: four-width regression checks real interactions in the repaired layout.
4. Save/share/export: original acceptance checks projected configuration, persisted views, filtered/formatted files and PNG/SVG signatures.
5. Theme/locale/mobile controls: real switches, persistent state, mobile display disclosure and width changes checked.

## Results

Final results, screenshot comparisons and remaining limits follow below. This report makes no award-level or full WCAG conformance claim.

## Reverse checks and corrections

The first full Chromium regression caught a new R3 drag failure after target-size changes: the geometric center of a field row fell over a quick-action button. This was a real interaction conflict, not a calculation failure. The repair gives the field name a visible grip and its own native draggable surface; shortcut buttons remain separate. The acceptance continues to exercise a real mouse drag, not synthetic drop dispatch.

The mobile display-settings disclosure passed its state-preservation test, including switching back to desktop. Core R1, R2, R4–R8 passed in that run; R3 was kept failed until its dedicated rerun.


## Additional verified findings

- Q6, P2: English command search used untranslated Chinese labels/categories, so “Export” could not find the exports. Static command copy is translated and both original and localized labels/categories are searchable. The regression executes a real CSV download by keyboard.
- Q7, P1: at desktop widths the header disabled toolbar overflow while its controls exceeded the available width; the end controls were clipped and the reveal action was hidden. Toolbar scrolling and the reveal action now remain available. It honors reduced motion, and tests wait for settled scroll geometry before checking focus visibility.
- Q8, P1: mobile dataset tabs could paint across the telemetry badge because their flex child shrank without clipping/scrolling. The tab group now owns horizontal scrolling and stays geometrically separate from telemetry.
- Q9, P2: the format dialog had six unnamed selects in its default two-measure state; formula-builder and threshold fields also needed explicit names. Labels now include the measure name where relevant. Axe checks the dialog with its optional controls expanded.
- Q10, P1: the clipboard fallback dialog did not use the shared keyboard-focus hook. It now contains focus, handles Escape, restores the opener, names the textarea and scrolls within short viewports. A simulated clipboard permission denial is followed by real Worker parsing of the explicitly synthetic two-row CSV fixture.

All palette changes go through semantic foreground tokens; chart series and raw data retain their colors/values. Dark text tokens also replace earlier hardcoded overrides. The final axe pass caught and removed low-opacity count text and increased purple text contrast on tinted dark surfaces.

## Controlled capture notes

A draft detached-baseline run initially inherited the candidate working directory for Tailwind content scanning, producing missing baseline color utilities. Those captures were rejected. The runner now changes both source root and working directory before Vite/Tailwind starts. The accepted baseline screenshots visibly retain the original neon typography and compressed plot.

The first target-size change also conflicted with field dragging; it was corrected with a visible name grip before final acceptance. The first toolbar focus check sampled an in-flight smooth scroll. The app now honors reduced motion for JS scrolling, and the test checks settled geometry. Neither failure was counted as a pass.

## Final local results

| Check | Actual result |
|---|---|
| Node regression | 32 passed |
| Production build | Passed; Worker bundles unchanged; axe is absent from the production bundle |
| Chromium browser suite | 22 passed; final fixed-dark-surface follow-up: 3 relevant cases passed |
| Legacy smoke | Passed: 16 chart types; 320/390/768/1024/1440/1920 viewports; dialogs, split modes and actual CSV/XLSX downloads |
| Screenshot/axe runner | 16 states checked: four intro screens, four widths × two workbench themes, four import previews; zero violations in the selected WCAG A/AA rule sets, zero recorded page errors and no document horizontal overflow |
| 100k configuration refresh | Baseline 201–224ms; candidate 161–251ms, browser input-to-paint, four aggregations on the same low-cardinality synthetic CSV. Both are under 1s; this is not an aggregation-speed improvement claim. |
| 500k import/cancel | Full suite passed; final focused follow-up imported/aggregated 500k rows in 6284ms with 187 UI timer ticks and cancellation verified |

The earlier host had isolated >1s refresh measurements (including 2579ms input-to-paint and a 162ms Worker calculation inside another delayed run). They were not reclassified as passes or hidden by raising the threshold. After restoring the test environment, both detached baseline and candidate were rerun using the same Chromium binary and host, with all four measurements below 1s. The timing test now measures real browser change events through the committed result and two animation frames; it also logs host wall time. This does not establish a worst-case SLA across hardware, high-cardinality results or arbitrary datasets.

| CSS width | Table viewport before → after | Chart wrapper before → after |
|---|---|---|
| 360 | 538 → 538px | 160 → 260px |
| 768 | 0 → 247px | 160 → 286px |
| 1280 | 111 → 355px | 160 → 338.5px |
| 1440 | 141 → 355px | 160 → 338.5px |

At 360px the display settings changed from an always-visible 181px toolbar to a 34.875px disclosure. Settings persist when collapsed. Desktop settings remain visible. When both panes cannot fit, the workspace scrolls instead of compressing their data to nothing; users can still choose table-only or chart-only mode. Split resizing is constrained by the pane minima. The selection-badge space is deliberately retained to prevent table click targets moving during range selection.

Accepted paired screenshots (same viewport, fonts, data and theme):

- [Desktop before](quality-evidence/before-1280.png) / [desktop after](quality-evidence/after-1280.png)
- [Mobile before](quality-evidence/before-360.png) / [mobile after](quality-evidence/after-360.png)
- [Chart after scrolling to it](quality-evidence/after-chart-1280.png)
- [Baseline measurements](quality-evidence/before.json), [candidate measurements](quality-evidence/after.json), [paired refresh timing](quality-evidence/performance.json)

A fixed dark notification surface also uses its own dark ink tokens in light mode, preserving close-icon contrast; the focused regression checks the actual rendered icon/background ratio.

## Remaining limits and stop reason

Physical Edge, Safari, iPhone and Android devices and external screen readers were not operated locally. A WebKit engine run is provided by the PR workflow; inspect its current result before merging. Automated axe findings cover the states and rule sets named above, not a full WCAG 2.2 conformance certification. CSV encoding/header inference remains inherently ambiguous and retains the existing manual corrections. Large result and memory guards remain in force.

The loop stops after the identified P1/P2 repairs have runnable regressions, controlled before/after evidence and a global local recheck without a remaining major in-scope blocker. No P3 restyling, external visual imitation, stack replacement, deployment or merge is part of this change. Remote CI is the final cross-engine gate, not inferred from the local Chromium result.

## Changed files

- `.github/workflows/verify.yml`
- `README.md`
- `package-lock.json`
- `package.json`
- `src/components/ErrorBoundary.jsx`
- `src/constants/pivotConstants.js`
- `src/features/pivot/PivotWorkbench.jsx`
- `src/features/pivot/components/ChartStudio.jsx`
- `src/features/pivot/components/DatasetTabStrip.jsx`
- `src/features/pivot/components/FieldProfilerModal.jsx`
- `src/features/pivot/components/FieldShelf.jsx`
- `src/features/pivot/components/HeaderBar.jsx`
- `src/features/pivot/components/IntroScreen.jsx`
- `src/features/pivot/components/PivotTable.jsx`
- `src/features/pivot/components/SmartTemplatesBar.jsx`
- `src/features/pivot/components/StatusBar.jsx`
- `src/features/pivot/components/UnifiedChartTooltip.jsx`
- `src/features/pivot/components/modals/BinModal.jsx`
- `src/features/pivot/components/modals/CommandPaletteModal.jsx`
- `src/features/pivot/components/modals/DataSourceModal.jsx`
- `src/features/pivot/components/modals/DrillDownModal.jsx`
- `src/features/pivot/components/modals/FilterModal.jsx`
- `src/features/pivot/components/modals/FormatModal.jsx`
- `src/features/pivot/components/modals/SpecModal.jsx`
- `src/features/pivot/components/modals/TestSuiteModal.jsx`
- `src/features/pivot/components/modals/UploadModal.jsx`
- `src/features/pivot/components/modals/WorkspaceModal.jsx`
- `src/i18n.js`
- `src/index.css`
- `tailwind.config.js`
- `tests/browser/acceptance.spec.js`
- `scripts/quality-audit.mjs`
- `tests/browser/quality.spec.js`
- `docs/UI-QUALITY-LOOP.md`
- `docs/quality-evidence/ (paired screenshots and JSON evidence)`

## Authorized release follow-up (2026-10-21)

The user subsequently authorized review, merge/deployment and production checks in that order. Pre-merge review found two remaining defects: formatted Excel currency/percent cells became text (P1), and malformed workspace storage permanently blocked later saves (P2). Excel now reads raw typed cells, serializes dates as ISO and preserves text IDs; workspace load errors are reported once so later explicit saves can recover. The rejected cross-zone move already returned the original configuration; a browser regression now proves source preservation and unchanged history. Deployment uses Node 22, matching verification and the development dependency engine requirement. No production dependency was added.

Executed locally: 32/32 Node tests, production build and 25/25 Chromium browser tests. The new Excel test checks inferred types, text `00123`, summed amounts and a numeric XLSX average of `0.1875`. The storage regression saves after malformed JSON and reloads the saved view. The drag regression checks both zones and Undo after rejection. Initial new test attempts used a viewport too short for reliable native drag; their failures remain in local test results; corrected tests assert the intended state.

`scripts/delivery-smoke.mjs` runs the same import → row filter → chart drilldown → CSV export flow at 360px touch emulation and 1440px desktop, locally or at `DELIVERY_URL`. Both candidate checks passed with two of three fixture rows selected, correct total 30, no page exceptions, no non-GET requests and no document horizontal overflow. Inputs are explicitly synthetic fixtures, not user business data. JSON and screenshots are written to ignored `artifacts/delivery/`. Physical devices and private user files remain unverified.
