#!/usr/bin/env bash
# Rebuild public/fonts/lmmath-labels.woff2: Latin Modern Math (GUST Font License) cut down to the
# glyphs the prism figures' labels and equations use. Add a code point here when a label needs one.
# Needs TeX Live (for latinmodern-math.otf) and uv.
set -euo pipefail
cd "$(dirname "$0")/.."

src=$(kpsewhich latinmodern-math.otf)
glyphs=(
  U+28 U+29 U+2B U+3D   # ( ) + =
  U+303                 # combining tilde, for h̃
  U+1D450 U+1D451 U+1D456 U+1D45E U+1D45F U+1D460   # italic c d i q r s
  U+1D6FC U+1D6FD       # italic alpha beta
  U+210E U+2113         # italic h, script l
  U+22A4 U+2211         # transpose (down tack), n-ary sum
)
uv run --quiet --with fonttools --with brotli pyftsubset "$src" \
  --unicodes="$(IFS=,; echo "${glyphs[*]}")" \
  --layout-features='*' --flavor=woff2 \
  --output-file=public/fonts/lmmath-labels.woff2
echo "wrote public/fonts/lmmath-labels.woff2 from $src"
