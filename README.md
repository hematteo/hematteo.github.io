# hematteo.github.io

A personal research website for Matteo He, with AI-safety interests, selected interpretability research, education and distinctions, engineering experience, and a downloadable CV.

The original interactive 3D **physics junk drawer** still builds at `/drawer/`, but the homepage no longer links to it. Click any object there to read the story behind it.

**Live:** https://hematteo.github.io

![The junk drawer](./public/og.png)

## Research profile

The homepage is semantic HTML typeset like a LaTeX preprint: Latin Modern, numbered sections, an abstract, a correspondence footnote, hyperref-style link borders (red in-page, cyan URLs, green BibTeX), and an arXiv-style margin stamp dated at build time by a small plugin in `vite.config.js`. Paper summaries, links, and native expandable details work without JavaScript. A small module adds accessible figure enlargement; the 3D renderer loads only on `/drawer/`.

- Edit profile content in `index.html` and homepage styles in `src/paper.css`. The research explainers use `src/profile.css` and their page styles, with `src/paper-explorer.css` layered on top so they read as supplementary material. Fonts and link borders shared by all three pages live in `src/latex.css`.
- Fonts: `public/fonts/lmroman10-{regular,bold,italic}.woff2` and `lmmono10-regular.woff2` are Latin Modern Roman 10 and Mono 10 (GUST e-foundry, v2.005) converted to WOFF2 and subset to Latin text and punctuation; `lmmath-labels.woff2` is Latin Modern Math subset to the prism figure's labels. All under the GUST Font License (`public/fonts/GUST-FONT-LICENSE.txt`).
- Motion and graphics: `src/paper.js` loads the modules in `src/paper/`, styled by `src/paper-motion.css`. They cover the prism figure (Snell's-law refraction; pointer, touch drag or phone tilt), the Figure 1 replay from `public/research/trajectory-replay.json` (built by `scripts/build-replay-data.py`), red-pen marks (`ink.js`), "??" references that resolve once per visit, and hover previews for in-text references. Everything respects reduced motion, and the page reads fully without JavaScript.
- Phones (640px and below): `src/paper-mobile.css` and `src/paper-mobile.js`. A sticky running header shows the current section and opens a contents list, replacing the nav; without JavaScript the nav stays. Link rows get 44px tap areas, dates sit under headings, figures run edge to edge and open in a full-screen viewer with tap-to-zoom, and the explorers' score bars stack under their labels.
- Submission history: the stamp's version and date, and its history popover, come from `git log --first-parent` at build time (`vite.config.js`). The deploy workflow fetches full history for this.
- Figure enlargement: `src/profile.js`. Direct email and LinkedIn links work without JavaScript.
- Public CV, citations, and research figures: `public/cv/` and `public/research/`.
- Website CV source: `cv-source/matteo-he-research.tex`. Compile with `latexmk -pdf -outdir=/tmp/website-cv cv-source/matteo-he-research.tex`, then copy the PDF to `public/cv/`. The public version uses the research contact address; application CVs are maintained separately.
- Content provenance and publication-status rules: `CONTENT_SOURCES.md`.
- The Vite build emits the homepage, `/drawer/`, `/research/prism/`, and `/research/trajectories/`.

## Contact

The homepage and public CV use `matteohe.research@gmail.com`, as requested by Matteo. Email links open the visitor's mail application. There is no contact form, third-party delivery service, or reveal interaction.

## The drawer

Websites aren't supposed to have weight. This one does. Instead of a scrolling list of bullet points, ten accomplishments are real rigid bodies in a tray with real physics — pick them up, throw them at the walls, tip the coffee mug and watch it spill. Read all ten and the drawer tells you you're done.

Each object maps to something real:

| Object | Stands for |
|---|---|
| 🛶 Punt | MPhil, University of Cambridge |
| ✈️ Paper airplane | *Learning to Read Out* (paper) |
| 🔺 Glass prism | *Sparse Readout Prism* (paper) |
| 🕹️ Joystick | Low-bit RL policies (paper) |
| ☕ Coffee mug | Solo-built LLM platform, ~3K MAU (it spills) |
| ⌨️ Keyboard | Amazon Alexa-AI internship |
| 🖥️ GPU | `vigil-gpu`, open-source training monitor |
| 🐬 Dolphin | Dolphin-acoustics ML (F1 0.48 → 0.86) |
| 🏆 Trophy | Hackathon wins |
| 🥇 Medal | Top Student Medal, GRE 340/340 |

## Built with

- **[three.js](https://threejs.org)** — WebGL rendering, all objects modelled in code (no asset files)
- **[cannon-es](https://github.com/pmndrs/cannon-es)** — rigid-body physics
- **[Vite](https://vitejs.dev)** — build and dev server
- **Web Audio API** — every clonk, chirp, and fanfare is synthesised at runtime; no audio files
- No external requests at runtime — fonts are system stacks, textures are drawn on `<canvas>`

## Features

- Grab / throw / stack physics with material-accurate collision sounds
- Coffee that spills and stains the mat when the mug tips
- Idle life: the paper airplane glides, the dolphin flops, the prism casts a rainbow
- Completion funnel: read all ten → confetti + a call to action
- Mobile: tilt-to-slide gravity (device orientation) and bottom-sheet cards
- Keyboard navigable, screen-reader announcements, respects `prefers-reduced-motion`
- Light/dark themes; renderer sleeps when the scene is at rest to save battery

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # production build to dist/
npm run preview    # serve the built site
npm test           # drawer Playwright interaction suite
npm run smoke      # profile, responsive layout, CV, figures, and drawer smoke checks (used in CI)
```

Requires Node 18+. The full suite (`npm test`) uses your installed Chrome; CI uses Playwright's bundled Chromium.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). `.github/workflows/ci.yml` runs the smoke test on every push and PR.

## License

[MIT](./LICENSE) © Matteo He

### Connected discoveries

In `/drawer/`, bring the little desk light and prism together to split a beam.
Pass the existing paper airplane through that spectrum to color its wings, then
bring it gently beside an upright mug to let it settle on the rim. The paper
stays colored away from the light. Picking it up releases the perch; tipping the
mug releases it too. Click the desk light to switch it off or on.

The **Discoveries** button gives one hint at a time and optionally arranges the
current pairing. Keyboard users can browse objects with arrow keys, move the
selected object with **Shift + arrows**, and press **Enter** to read a story or
switch the lamp. The lamp is a play prop; the ten research/career stories retain
their separate completion counter. Reduced-motion mode keeps the same discoveries
with immediate color and landing changes. **Dump again** resets the physical
states while keeping the field notes for the current visit; no storage is used.

### GPU flight chain and graphics

Bring the paper beside an upright GPU to spin up its fans and lift the paper.
A colored plane leaves a fading rainbow ribbon. Move the GPU to move the updraft;
bring the joystick nearby for three discrete steering actions: left, neutral, right (A / S / D). The joystick can also launch the plane without the GPU. Flights end after a
short interval, or with **Land**. They restart only after another interaction.
The Discoveries panel has eleven entries and a picker for trying any pairing.

Reduced motion keeps the discoveries and controls, with immediate positioning
and no spinning fans, animated wind or trails. The scene retains idle rendering.
Beveled edges, articulated GPU fans, paper folds, hollow glazed ceramic,
transmissive glass, soft shadows and warmer/cooler light separation refine the
existing workshop rather than replacing its layout.

### More combinations

- Tap the dolphin to send a visible acoustic pulse. Nearby objects reflect it;
  the dolphin turns toward returning echoes. Repeat from its story card.
- GPU + keyboard runs a deliberately fictional training sequence across the keycaps.
  A plateau lights the GPU’s vigil indicator amber. **Resume run** completes it;
  separating the pair disconnects it.
- The prism leaves one white residual beside its spectrum. Rest the paper over
  its tip to pin it; pick up or move the paper to let it escape.
- Bring the dolphin alongside the punt to board. It follows the boat, adds weight,
  and jumps out if the boat moves too abruptly. **Nudge the boat** in its story
  card is an accessible way to try that response.
- The trophy reflects the lamp according to its orientation. Select any object
  and press **R** to rotate it (Shift + R reverses); the trophy’s story card also
  offers a turn button. A reflected beam can power the prism’s spectrum.

Echoes, boarding, fan activity and the released thread finish their animations
and allow rendering to sleep. Reduced motion preserves every discovery while
suppressing spinning, hopping, trails and traveling pulses. All physical states
reset on **Dump again**, while the eleven field notes remain for this visit.
