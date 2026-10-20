#!/bin/bash
# /root/awg/ignes_peer.sh
# Peer management for IGNES API. Coexists with manage_amneziawg.sh (shared lock).
#
# Source: IGNES-Core/scripts/vps/ignes_peer.sh
# Deploy: scp -i ~/.ssh/ignes_vps <this> root@163.5.29.213:/root/awg/ignes_peer.sh
#         chmod 700 && chown root:root
#
# Env overrides: AWG_DIR, SERVER_CONF, IFACE, LOCKFILE, SUBNET, SERVER_IP, DRY_RUN
#   DRY_RUN=1 → validate strip, but skip `awg syncconf` (safe for testing on a copy)

set -euo pipefail
umask 077

AWG_DIR="${AWG_DIR:-/root/awg}"
SERVER_CONF="${SERVER_CONF:-/etc/amnezia/amneziawg/awg0.conf}"
IFACE="${IFACE:-awg0}"
LOCKFILE="${LOCKFILE:-${AWG_DIR}/.awg_config.lock}"
SUBNET="${SUBNET:-10.9.9}"
SERVER_IP="${SERVER_IP:-${SUBNET}.1}"
DRY_RUN="${DRY_RUN:-0}"                                                           

# exit codes: 0=ok, 2=bad args/validation, 3=conflict, 4=apply failed, 5=lock failed
ok()  { printf '{"ok":true,"data":%s}\n' "${1:-null}"; }
err() { local code="$1" msg="$2"; printf '{"ok":false,"error":"%s"}\n' "$msg"; exit "$code"; }

[[ "$SERVER_CONF" == *.conf ]] || err 2 "SERVER_CONF must end in .conf (awg-quick requirement)" 

# CRITICAL: empty strip - syncconf wipes ALL peers. Validate first.
apply_config() {
  local stripped
  if ! stripped="$(awg-quick strip "$SERVER_CONF" 2>&1)"; then
    printf 'strip failed: %s\n' "$stripped" >&2
    return 1
  fi
  if [[ "$stripped" != *"PrivateKey"* ]]; then
    printf 'stripped config missing PrivateKey — refusing syncconf\n' >&2
    return 1
  fi
  if [[ "$DRY_RUN" == "1" ]]; then                                                 
    printf 'DRY_RUN=1: skipping awg syncconf (strip OK)\n' >&2
    return 0
  fi
  if ! awg syncconf "$IFACE" <(printf '%s\n' "$stripped") 2>&1; then
    return 1
  fi
}

# Run mutation with backup + rollback. Backup restored on any failure.
with_rollback() {
  local backup
  backup="$(mktemp "${SERVER_CONF}.bak.XXXXXX")"
  cp -p "$SERVER_CONF" "$backup"
  local rc=0
  set +e
  "$@"
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    cp -p "$backup" "$SERVER_CONF"
    rm -f "$backup"
    apply_config >/dev/null 2>&1 || true                                           
    err 4 "failed to apply config (rolled back)"
  fi
  rm -f "$backup"
}

cmd_add() {
  [[ $# -eq 3 ]] || err 2 "usage: add <name> <public_key> <ip>"
  local name="$1" pubkey="$2" ip="$3"

  [[ "$pubkey" =~ ^[A-Za-z0-9+/]{43}=$        ]] || err 2 "invalid public key"
  [[ "$name"   =~ ^[a-zA-Z0-9_-]{1,36}$       ]] || err 2 "invalid name"
  [[ "$ip"     =~ ^${SUBNET//./\\.}\.([2-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-4])$ ]] \
    || err 2 "invalid ip"
  [[ "$ip" != "$SERVER_IP" ]] || err 2 "cannot use server ip"

  if grep -qxF -- "# ignes:${name}" "$SERVER_CONF" 2>/dev/null; then
    err 3 "peer name already exists"
  fi
  if grep -qxF -- "PublicKey = ${pubkey}" "$SERVER_CONF" 2>/dev/null; then
    err 3 "public key already exists"
  fi
  if grep -qxF -- "AllowedIPs = ${ip}/32" "$SERVER_CONF" 2>/dev/null; then
    err 3 "ip already in use"
  fi

  _do_add() {
    {
      printf '\n# ignes:%s\n[Peer]\nPublicKey = %s\nAllowedIPs = %s/32\n' \
        "$name" "$pubkey" "$ip"
    } >> "$SERVER_CONF"
    apply_config || return 1
  }
  with_rollback _do_add
  ok "{\"name\":\"${name}\",\"ip\":\"${ip}\"}"
}

cmd_remove() {
  [[ $# -eq 1 ]] || err 2 "usage: remove <name>"
  local name="$1"
  [[ "$name" =~ ^[a-zA-Z0-9_-]{1,36}$ ]] || err 2 "invalid name"

  if ! grep -qxF -- "# ignes:${name}" "$SERVER_CONF" 2>/dev/null; then
    ok "{\"name\":\"${name}\",\"removed\":false}"
    return 0
  fi

  _do_remove() {
    python3 - "$SERVER_CONF" "$name" <<'PY' || return 1
import os, sys, tempfile
path, name = sys.argv[1], sys.argv[2]
marker = f"# ignes:{name}"
with open(path) as f:
    lines = f.read().splitlines(keepends=True)
out, in_block, seen_peer = [], False, False
for line in lines:
    s = line.strip()
    if in_block:
        if not seen_peer and s == "[Peer]":
            seen_peer = True
            continue
        if seen_peer and s and not s.startswith(("[", "#")):
            continue
        in_block = False
        if s == "":
            continue
    if s == marker:
        in_block, seen_peer = True, False
        if out and out[-1].strip() == "":
            out.pop()
        continue
    out.append(line)
mode = os.stat(path).st_mode & 0o777
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path))
with os.fdopen(fd, "w") as f:
    f.writelines(out)
os.chmod(tmp, mode)
os.replace(tmp, path)
PY
    apply_config || return 1
  }
  with_rollback _do_remove
  ok "{\"name\":\"${name}\",\"removed\":true}"
}

cmd_list() {
  awg show "$IFACE" dump 2>/dev/null | tail -n +2 | python3 -c '
import sys, json
rows = []
for line in sys.stdin:
    p = line.rstrip("\n").split("\t")
    if len(p) < 8: continue
    rows.append({"pubkey": p[0], "endpoint": p[2], "allowed_ips": p[3], "handshake": int(p[4] or 0)})
print(json.dumps({"ok": True, "data": rows}))
'
}

# Lock: mutual exclusion with manage_amneziawg.sh
exec {lock_fd}>"$LOCKFILE"
flock -x -w 10 "$lock_fd" || err 5 "lock acquisition failed"

case "${1:-}" in
  add)    shift; cmd_add "$@" ;;
  remove) shift; cmd_remove "$@" ;;
  list)   cmd_list ;;
  *)      err 2 "unknown command" ;;
esac