# PivotStudio · Global Design Quality Review

Date: 2026-10-20
Baseline: `8a9eb40ced893fde061b3b7f35a7d64d953d9836`
Review scope: current source code and GitHub Actions. Live interactive browser comparison and screenshots were **not available** in this execution environment.

## Quality target

Aim for the level of polish demonstrated by excellent comparable interactive web applications across Awwwards, The Webby Awards and FWA. This is an internal quality ambition, **not** an award or external certification.

Webby official criteria include content, structure/navigation, visual design, functionality, interactivity, innovation and overall experience: https://www.webbyawards.com/judging-criteria/

## Verified issues and changes in round 1

1. The default `.apple-font-sans` applied JetBrains Mono before the system UI fonts to all body text. This compromised typography hierarchy and readability. Fixed: UI text uses system sans first; data/code retains monospace.
2. `.apple-transition` used `transition: all`, which animates geometry and can produce visual instability during resizing. Fixed: limited transitions to visual properties.
3. Existing focus outline used a bright cyan for both light and dark modes. Fixed: contrast-aware focus token per theme.
4. Added consistent disabled cursor/opacity and reduced mobile card-shadow visual noise.
5. Kept the existing Monokai color identity, data model, chart engine, layouts and working features.

## Still unverified or unresolved

1. Browser-level full workflow regression across desktop, tablet and mobile, including import, pivot, charts, export and dialogs.
2. Screenshots of comparable award-level data products and side-by-side visual evaluation.
3. Header toolbar density, narrow viewport controls and small-text legibility. Requires browser evidence before restructuring.
4. Modal focus trapping, keyboard-only operation and screen-reader labels.
5. Performance with 100k synthetic rows; calculation still runs in JavaScript on the UI thread.
6. Data source and connector limitations in `docs/FEATURE_STATUS.md`.

## Global repeatable review protocol

For every iteration: inspect the **entire** application, reproduce a real issue, capture a baseline, change the minimum necessary code, run tests/build, inspect actual desktop/tablet/mobile UI, compare the whole app again, and record evidence. Do not claim an award-level result based only on CI. Do not change already-stable features for cosmetic novelty.

Exit only when functionality, typography, spacing, interaction, responsive behavior, consistency, accessibility and visual identity have no obvious unresolved gaps in actual browser comparison. If live browser inspection cannot be completed, explicitly report that the quality target is **not yet verified**.
