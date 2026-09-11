# Design QA

- Source visual truth: `C:\Users\PA\AppData\Local\Temp\codex-clipboard-132c172a-ee81-4815-aed8-4e5befe92836.png`
- Implementation: Codex in-app browser at `http://127.0.0.1:3000/`
- Implementation screenshot: inline Codex in-app browser capture (the browser API did not expose a persistent local screenshot path)
- Source pixels: 744 × 746
- Implementation pixels: 394 × 879 JPEG
- CSS viewport: approximately 394 × 879 at device scale 1
- Density normalization: source and implementation were reviewed at their native densities; layout was compared by responsive structure rather than pixel overlay because the supplied source and available browser viewport have different aspect ratios.
- State: empty ballot, no candidates selected, add-candidate panel closed

## Full-view comparison evidence

The source image and final implementation were emitted together in one browser comparison call. Both show instructions first, followed by a vertically divided checkbox list with bold uppercase candidate names. The implementation preserves that information hierarchy and interaction model, while applying the requested responsive card layout, 15-person list, persistent selection count, and explicit add-candidate action.

## Focused region comparison evidence

The instruction block and candidate-list region were readable in the full comparison. A separate interaction check opened the add-candidate panel, searched without accents, selected a suggested name, verified automatic selection, and verified the added name was removed from subsequent suggestions. The review dialog, confirmation success state, results tab, and rank promotion after hiding the first result were also tested.

## Required fidelity surfaces

- Fonts and typography: Arial/Helvetica closely follows the source's plain sans-serif presentation. Candidate labels use bold uppercase text, and Vietnamese diacritics render correctly. Mobile headings and body copy wrap without overlap.
- Spacing and layout rhythm: list rows retain the source's generous vertical rhythm and separators. The card padding, instruction spacing, and sticky mobile submission bar remain usable at the tested narrow viewport.
- Colors and visual tokens: the source's white/gray form is retained and extended with a restrained blue selection/action system. Contrast remains clear for body copy, labels, controls, disabled state, and errors.
- Image quality and asset fidelity: the source contains no photographic or illustrative assets. UI icons use the Phosphor icon library; no placeholder imagery or handcrafted SVG assets are present.
- Copy and content: all visible copy is in Vietnamese and directly supports selecting, adding, reviewing, submitting, and understanding local-only statistics.

## Findings

- No actionable P0, P1, or P2 issues remain.
- The circular Next.js development control visible at the lower-left in local preview is development-only chrome and is not part of the production build.

## Comparison history

1. Initial interaction pass found a P2 issue: an added suggestion could still appear when the search field became empty. The suggestion filter was updated to exclude every name already present, including in the empty-query state.
2. Post-fix evidence confirmed that after adding `NGUYỄN HOÀNG BẢO`, the name disappeared from suggestions while the remaining suggestions stayed selectable.
3. Final empty-state comparison showed no remaining P0/P1/P2 issues.

## Implementation checklist

- [x] Responsive ballot form
- [x] Fifteen preset candidates
- [x] Multi-select checkboxes
- [x] Add multiple external candidates
- [x] Accent-insensitive suggestions
- [x] Duplicate-name prevention
- [x] Review-before-submit flow
- [x] Browser-local submissions and statistics
- [x] Automatic rank promotion after hiding a result
- [x] Successful production build

## Follow-up polish

- P3: replace the placeholder candidate names and term label with the organization's final data before real use.

final result: passed
