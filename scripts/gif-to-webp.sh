#!/bin/bash
# Make the animated WebP that the site shows in place of a GIF hero.
#
#   scripts/gif-to-webp.sh content/posts/<post>/<hero>.gif [lossless|mixed]
#
# Writes <hero>.webp next to the GIF. layouts/partials/featured-image.html picks it up by name
# and serves it instead of the GIF (the GIF stays as the <img> fallback and the file to share).
#
#   lossless (default)  pixel-identical; best for flat UI-style animations (the Notion hero)
#   mixed               lossy/lossless per frame at q80; best for illustrated or photographic
#                       animations (the tokenmax loop)
#
# Needs libwebp's gif2webp and anim_diff (Homebrew: `brew install webp`, or Google's release
# binaries). The script refuses to keep a file that doesn't match the GIF: same loop count and
# total duration, and at least 40 dB PSNR on every frame (anim_diff).
set -euo pipefail
gif=${1:?usage: scripts/gif-to-webp.sh path/to/hero.gif [lossless|mixed]}
mode=${2:-lossless}
out=${gif%.gif}.webp
case "$mode" in
  lossless) opts=(-m 6 -mt) ;;
  mixed) opts=(-mixed -q 80 -m 6 -mt) ;;
  *) echo "mode must be lossless or mixed" >&2; exit 2 ;;
esac
gif2webp "${opts[@]}" -quiet "$gif" -o "$out"
# A GIF without a NETSCAPE loop extension plays once in browsers; keep that behavior.
if ! LC_ALL=C grep -q 'NETSCAPE2.0' "$gif"; then
  webpmux -set loop 1 "$out" -o "$out.tmp" >/dev/null && mv "$out.tmp" "$out"
fi
if ! anim_diff "$gif" "$out" -min_psnr 40 >/dev/null; then
  rm -f "$out"
  echo "rejected: $out differs from the GIF by more than 40 dB PSNR, or in loop/timing" >&2
  exit 1
fi
echo "$(basename "$gif") $(wc -c < "$gif" | tr -d ' ') bytes -> $(basename "$out") $(wc -c < "$out" | tr -d ' ') bytes ($mode)"
