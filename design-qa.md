# Design QA — Biểu đồ phiếu bầu dạng thanh ngang

- Source visual truth: `C:\Users\PA\AppData\Local\Temp\codex-clipboard-60fd9808-f2e2-4337-b8b2-e83ee8d998e9.png`
- Source pixels: 792 × 442
- Implementation: `http://127.0.0.1:3000/admin`
- Implementation screenshot: Codex in-app Browser capture attached to this task; the browser tool did not expose a filesystem path
- Viewport: 1200 × 900 CSS px
- Implementation capture pixels: 1200 × 900; device scale factor 1
- Density normalization: visual proportions compared at fitted width because the source is a cropped chart and the implementation is an Admin page region
- State: 15 candidates, sample QA votes 5/4/4/4/3/1/0…; sample data was removed after capture

## Full-view comparison evidence

Both the supplied source and the rendered Admin chart were opened and inspected. The implementation matches the defining structure: numbered ranking on the left, bold uppercase candidate names, one-color horizontal bars, red values immediately after bar endpoints, vertical grid lines, numeric axis, and zero-vote rows below the voted candidates. The surrounding header and live-refresh controls intentionally retain the existing Admin design system.

## Focused region comparison evidence

The populated chart region was inspected at 1200 × 900. Bar lengths correctly map 5, 4, 4, 4, 3, and 1 votes to the shared scale; equal values produce equal lengths; the maximum value remains readable outside the bar; zero values align at the baseline. Labels and ranks stay aligned in separate columns without wrapping.

## Findings

No remaining P0, P1, or P2 visual differences.

## Required fidelity surfaces

- Fonts and typography: bold uppercase names, compact rank numbers, and red vote totals reproduce the source hierarchy while using the established Admin font stack.
- Spacing and layout rhythm: rows use a compact 30 px rhythm; the label/plot split aligns closely with the source and remains horizontally scrollable on narrow screens.
- Colors and visual tokens: all bars use the same deep violet; vote values use dark red; light vertical grid lines remain visible without overpowering the data.
- Image quality and asset fidelity: the source chart contains no raster imagery or non-standard assets to reproduce.
- Copy and content: rank, full candidate name, vote number, zero-vote candidates, axis values, and realtime status are all present.

## Primary interactions and console

- Automatic five-second refresh remains active.
- Manual refresh button is present and enabled outside a request.
- Horizontal overflow is scoped to the chart on narrow layouts.
- Browser console error check: no errors.
- Local data API reports a handled configuration message because `DATABASE_URL` is not present locally; this does not affect the Vercel environment and is separate from chart rendering.

## Comparison history

- Initial pass: blocked by the local Admin authentication screen.
- Second pass: authentication restored; found P2 density drift (rows too tall) and color drift (first bar blue while the reference uses one bar color).
- Fixes: reduced row height from 35 px to 30 px, reduced bar thickness, removed the special first-place color, and kept values outside maximum-length bars.
- Final pass: populated chart capture confirmed correct ranking, proportions, label alignment, grid alignment, and endpoint values.

## Follow-up polish

- P3: local visual testing would be more convenient after pulling `DATABASE_URL` from Vercel into an ignored local environment file.

final result: passed
