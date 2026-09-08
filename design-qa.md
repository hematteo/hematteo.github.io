# Research profile verification

Date: 2026-09-08

Final result: passed (implementation and browser checks against the approved written brief; this is not a pixel-matching comparison to an image mockup).

## Verified

- Research-first homepage with restrained typography, a compact introduction, selected research, supporting engineering, background and contact.
- First-author and manuscript/preprint statuses explicit; no invented publication acceptance, affiliation, portrait, or research results.
- Real source figure opens in a native modal dialog. Focus moves to Close; Escape closes the dialog. Original image links remain valid without the enhancement.
- Native research-method disclosures expand.
- CV returns HTTP 200 with application/pdf content type; local CV bytes are copied from the canonical research CV.
- Responsive layout fits 320, 390, 768 and 1440px widths without horizontal overflow (automated smoke checks).
- Visual review at 390x844 and 1440x1000: readable layout, figures correctly placed, no overlapping content. Section note hidden on mobile to keep the research heading on one line.
- Mobile Systems navigation lands at the section. Drawer link opens the preserved 3D site; Research profile link returns to the new page.
- No 3D runtime on the homepage. All ten drawer objects initialize. Zero runtime/console errors in the smoke suite.
- 21 local links and assets resolve; IDs are unique. JavaScript syntax and git whitespace checks pass.
- Vite production build emits the root profile and /drawer/ separately.

## Evidence

- `../website-review/profile-desktop.png` (accepted viewport capture)
- `../website-review/profile-mobile.png` (accepted mobile introduction capture)
- `npm run smoke`: 15 checks passed.
- `npm run build`: passed.

A stitched full-page screenshot was rejected because the browser capture duplicated content. The accepted desktop evidence is a normal viewport screenshot. This is not a full WCAG conformance audit; no external paper-link availability guarantee is claimed. The longer physics interaction suite was not rerun because drawer physics code was unchanged; the existing test URL now targets /drawer/.

## Delivery

Local working preview: http://127.0.0.1:4187/
Branch: codex/research-profile
No remote push or public deployment performed.
