#!/bin/bash
set -euo pipefail

# Generate SSH keypair for peer management if missing.
# Persisted in named volume `ignes_ssh_keys` mounted at /root/.ssh.
# The public key must be added to /root/.ssh/authorized_keys on the host
# with forced command peer-dispatch (see IGNES-Docs or scripts/vps/).

if [ ! -f /root/.ssh/id_ed25519 ]; then
  echo "Generating SSH keypair for peer management..."
  mkdir -p /root/.ssh
  chmod 700 /root/.ssh
  ssh-keygen -t ed25519 -N '' -f /root/.ssh/id_ed25519 -C "ignes-container"
  echo ""
  echo "=========================================================="
  echo "SSH key generated. Add this public key to /root/.ssh/authorized_keys"
  echo "on the host with forced command peer-dispatch:"
  echo ""
  cat /root/.ssh/id_ed25519.pub
  echo "=========================================================="
  echo ""
else
  echo "SSH key already exists at /root/.ssh/id_ed25519"
fi

# Ensure permissions (named volume may override)
chmod 700 /root/.ssh
chmod 600 /root/.ssh/id_ed25519 2>/dev/null || true
chmod 644 /root/.ssh/id_ed25519.pub 2>/dev/null || true

exec "$@"
