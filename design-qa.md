# Design QA — Biểu đồ phiếu bầu dạng thanh ngang

- Source visual truth: `C:\Users\PA\AppData\Local\Temp\codex-clipboard-84cf4b89-f0ed-4c1a-afaf-7d914ad9705a.png`
- Source pixels: 1213 × 542
- Implementation: `http://127.0.0.1:3000/admin`
- Implementation screenshot: Codex in-app Browser capture attached to this task; the browser tool did not expose a filesystem path
- Viewports: desktop 1200 × 900 CSS px; mobile iframe 375 × 844 CSS px
- Implementation capture: Codex in-app Browser desktop capture plus a same-origin 390 px mobile frame (375 px usable width after scrollbar); device scale factor 1
- Density normalization: visual proportions compared at fitted width because the source is a cropped chart and the implementation is an Admin page region
- State: 15 candidates, sample QA votes 5/4/4/4/3/1/0…; sample data was removed after capture

## Full-view comparison evidence

Both the supplied source and the rendered Admin chart were opened and inspected. The requested target removes the vertical guide lines while preserving numbered ranking on the left, uppercase candidate names, one-color horizontal bars, red values immediately after bar endpoints, and zero-vote rows below the voted candidates. A second browser capture at 375 px usable width confirmed the chart contracts into the mobile card instead of requiring horizontal scrolling.

## Focused region comparison evidence

The populated chart region was inspected at 1200 × 900. Bar lengths correctly map 5, 4, 4, 4, 3, and 1 votes to the shared scale; equal values produce equal lengths; the maximum value remains readable outside the bar; zero values align at the baseline. At the 375 px mobile viewport, ranks, truncated names, plot area, and values remain in a single readable row. Browser measurement reported chart `clientWidth = 319`, `scrollWidth = 319`, and page `clientWidth = scrollWidth = 375`.

## Findings

No remaining P0, P1, or P2 visual differences.

## Required fidelity surfaces

- Fonts and typography: bold uppercase names, compact rank numbers, and red vote totals reproduce the source hierarchy while using the established Admin font stack.
- Spacing and layout rhythm: rows use a compact 30 px rhythm; on mobile the label/plot split scales to 42%/58%, with tighter rank, label, and value spacing and no horizontal scrollbar.
- Colors and visual tokens: all bars use the same deep violet and vote values use dark red; vertical grid lines were removed as requested.
- Image quality and asset fidelity: the source chart contains no raster imagery or non-standard assets to reproduce.
- Copy and content: rank, full candidate name, vote number, zero-vote candidates, and realtime status are all present.

## Primary interactions and console

- Automatic five-second refresh remains active.
- Manual refresh button is present and enabled outside a request.
- Mobile chart overflow is removed: measured chart and page scroll widths exactly equal their client widths.
- Browser console error check: no errors.
- Local data API reports a handled configuration message because `DATABASE_URL` is not present locally; this does not affect the Vercel environment and is separate from chart rendering.

## Comparison history

- Initial pass: blocked by the local Admin authentication screen.
- Second pass: authentication restored; found P2 density drift (rows too tall) and color drift (first bar blue while the reference uses one bar color).
- Fixes: reduced row height from 35 px to 30 px, reduced bar thickness, removed the special first-place color, and kept values outside maximum-length bars.
- Final desktop pass: populated chart capture confirmed correct ranking, proportions, label alignment, and endpoint values; the later scoped update removed the vertical grid markup and styles entirely.
- Mobile pass: the earlier 620 px minimum width caused a P2 horizontal-scroll requirement. The chart now has no minimum width below 700 px, uses a compact responsive grid, and the post-fix 375 px capture plus DOM measurements confirmed zero horizontal overflow.

## Follow-up polish

- P3: local visual testing would be more convenient after pulling `DATABASE_URL` from Vercel into an ignored local environment file.

final result: passed
