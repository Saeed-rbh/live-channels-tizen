#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo 'Usage: bash scripts/build.sh YOUR_CERTIFICATE_PROFILE' >&2
  exit 1
fi
project_root="$(cd "$(dirname "$0")/.." && pwd)"
tizen_cli="${TIZEN_CLI:-tizen}"
package_stage="$(mktemp -d)"
trap 'rm -rf "$package_stage"' EXIT
cp -R "$project_root/LiveChannels/." "$package_stage/"
"$tizen_cli" package -t wgt -s "$1" -- "$package_stage"
mkdir -p "$project_root/dist"
cp "$package_stage/Live Channels.wgt" "$project_root/dist/Live-Channels.wgt"
echo "Built $project_root/dist/Live-Channels.wgt"
