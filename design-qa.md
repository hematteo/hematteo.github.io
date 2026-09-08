# Research profile verification

Date: 2026-09-08

Current result: passed after the AI-safety positioning and contact-privacy revision described below. Earlier verification records and captures refer to their respective revisions.

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

## CV-inspired content revision

Reviewed all three one-page source PDFs visually and as extracted text: `mhcv.pdf`, the AI-safety canonical CV, and the Neel Nanda MATS CV. Updated the introduction to foreground faithful readout measurement, moved first-author research into the introductory credentials, and replaced generic paper summaries with the CVs' scoped findings. Kept detailed experimental conditions in expandable method sections.

The 15-check smoke suite passed after these content changes. Subsequent copy-only edits clarified the research questions, restored the fixed Pythia-1B step-1000 condition, and used “at least ten” for the CV's “10+” attention heads. Final production build and whitespace checks passed.

The final visual recheck of this revision was blocked: automatic browser approval review reported a revoked refresh token and required signing in again. Earlier screenshots show the preceding copy, not this revision. No browser workaround was attempted. The original layout verification and the new automated checks remain the available evidence.

## AI-safety positioning and contact privacy revision

- Broadened the profile around safety, alignment, and oversight; explicitly describes readout projects as MPhil dissertation work. Seeking safety fellowships and research roles.
- Reordered sections: profile/interests, selected research, education/distinctions, research engineering, contact. GRE 340/340 and both section scores included with academic distinctions.
- Removed direct address from initial HTML, structured metadata, and drawer. Accessible reveal buttons create mail links on activation and preserve keyboard focus; LinkedIn fallback is visible without JavaScript.
- Public CV rebuilt from the canonical AI-safety source with broader positioning, dissertation context, GRE, and website contact instead of direct email/phone. One-page render inspected: legible, no clipping or overlap. PDF text and annotation checks confirm contact link, no direct address/phone, and no embedded attachments.
- Production build and 21 smoke checks passed, including keyboard reveal, both contact controls, no-JavaScript fallback, four viewport widths after reveal, figure dialog, research disclosures, and preserved drawer initialization. Built HTML/JS/CSS/JSON checked for plaintext address.
- Browser access is working again. Fresh CUA inspection verified the updated introduction and mobile education/GRE layout. Earlier saved screenshots are not evidence of this revision.
- Obfuscation reduces simple scraping only. Existing public copies, repository history, external linked papers, and sophisticated crawlers remain outside this protection.
