#!/usr/bin/env bash
# Regenerate every image in content/posts/building-with-grok-bot/ from these sources, then refresh
# the GIF heroes' WebPs. Intermediate files go to ./out (git-ignored). See README.md.
#
#   PYTHON=/path/to/venv/bin/python ./build.sh          # everything
#   PYTHON=... ./build.sh figures                        # SVG figures + social card only
#   PYTHON=... ./build.sh hero                           # desktop + phone heroes only
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
BUNDLE="$ROOT/content/posts/building-with-grok-bot"
OUT="$HERE/out"
PY="${PYTHON:-python3}"
WHAT="${1:-all}"
cd "$HERE"
mkdir -p "$OUT/svg"

gif() {  # frames dir -> looping GIF at 12.5 fps (80 ms frames), flat palette, no dithering
  ffmpeg -v error -y -framerate 12.5 -i "$1/f%04d.png" \
    -vf "split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" \
    -loop 0 "$2"
}

if [[ "$WHAT" == all || "$WHAT" == figures ]]; then
  "$PY" fleet.py "$OUT/svg"
  "$PY" botons.py "$OUT/svg"
  "$PY" social.py "$OUT/svg"
  "$PY" render.py "$OUT" "$OUT/svg/social-card.svg" >/dev/null
  cp "$OUT"/svg/router-before*.svg "$OUT"/svg/ceo-after*.svg "$OUT"/svg/grok-bot-to-botons*.svg "$BUNDLE/"
  magick "$OUT/social-card.png" -strip "$BUNDLE/social-card.png"
fi

if [[ "$WHAT" == all || "$WHAT" == hero ]]; then
  "$PY" hero.py "$OUT" >/dev/null
  "$PY" hero_phone.py "$OUT" >/dev/null
  gif "$OUT/frames" "$OUT/hero.gif"
  gif "$OUT/frames-phone" "$OUT/hero-phone.gif"
  cp "$OUT/hero.gif" "$BUNDLE/grok-bot-hero.gif"
  cp "$OUT/hero-phone.gif" "$BUNDLE/grok-bot-hero-phone.gif"
  magick "$OUT/poster.png" -strip "$BUNDLE/grok-bot-hero-poster.png"
  magick "$OUT/poster-phone.png" -strip "$BUNDLE/grok-bot-hero-phone-poster.png"
  python3 "$ROOT/scripts/gif-heroes.py" build
fi
echo "Updated $BUNDLE"
