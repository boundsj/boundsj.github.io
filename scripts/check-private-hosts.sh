#!/usr/bin/env bash
# Fail if a tailnet hostname (*.ts.net) or tailnet IP (100.64.0.0/10) is in the site sources.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
pattern='ts\.net|(^|[^0-9.])100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.'
if git grep -I -nE "$pattern" -- content layouts static themes/bounds-ascii config.toml; then
  echo "Private tailnet host or IP found above. Use a relative or bounds.dev link." >&2
  exit 1
fi
