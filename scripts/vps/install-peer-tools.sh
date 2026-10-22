#!/bin/bash
# Install peer management tools to /usr/local/bin.
# Idempotent: safe to re-run after updating files in scripts/vps/.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/usr/local/bin"

for f in peer-add peer-remove peer-list peer-dispatch; do
  if [ ! -f "$SCRIPT_DIR/$f" ]; then
    echo "ERROR: $SCRIPT_DIR/$f not found" >&2
    exit 1
  fi
  install -m 700 -o root -g root "$SCRIPT_DIR/$f" "$TARGET_DIR/$f"
  echo "Installed: $TARGET_DIR/$f"
done

echo ""
echo "Verify with:"
echo "  SSH_ORIGINAL_COMMAND='peer-list' $TARGET_DIR/peer-dispatch"
