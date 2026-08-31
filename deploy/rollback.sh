#!/usr/bin/env bash
# Roll miraddo.com back to the previous release.
#
#   ./deploy/rollback.sh            # previous release
#   ./deploy/rollback.sh 20260831-205607   # a specific one
#   ./deploy/rollback.sh --list     # what is available
#
# This runs when the site is already broken and nobody is calm, so it is built
# to fail loudly rather than quietly do nothing:
#
#   - Releases are ordered by NAME (YYYYmmdd-HHMMSS sorts chronologically), not
#     by mtime. `tar -xz` stamps directories with the local build's timestamps,
#     so mtime order is not deploy order.
#   - "The previous one" is resolved relative to what `current` actually points
#     at, so a second consecutive rollback keeps going back instead of
#     re-selecting the same release.
#   - It refuses, with exit 1, when there is no candidate.
#   - The swap is the same atomic ln/mv used by deploy.sh.
set -euo pipefail

SERVER="${MIRADDO_SERVER:-root@65.109.219.238}"
KEY="${MIRADDO_SSH_KEY:-$HOME/.ssh/fluentx}"
ROOT="/opt/miraddo"
SITE="https://miraddo.com"
SSH_OPTS=(-o ConnectTimeout=20 -i "$KEY")
ssh_() { ssh "${SSH_OPTS[@]}" "$SERVER" "$@"; }

CURRENT=$(ssh_ "readlink '$ROOT/current' | sed 's|releases/||'")
mapfile -t RELEASES < <(ssh_ "ls -1 '$ROOT/releases'" | sort -r)

if [ "${1:-}" = "--list" ]; then
  echo "current: $CURRENT"
  for r in "${RELEASES[@]}"; do
    [ "$r" = "$CURRENT" ] && echo "  $r  <- current" || echo "  $r"
  done
  exit 0
fi

if [ $# -ge 1 ]; then
  TARGET="$1"
  printf '%s\n' "${RELEASES[@]}" | grep -qx "$TARGET" || {
    echo "!! release '$TARGET' does not exist on the server. Try --list." >&2
    exit 1
  }
else
  # First release, in reverse-chronological order, that is not the current one.
  TARGET=""
  for r in "${RELEASES[@]}"; do
    if [ "$r" != "$CURRENT" ]; then TARGET="$r"; break; fi
  done
  [ -n "$TARGET" ] || {
    echo "!! no release to roll back to — '$CURRENT' is the only one on the server." >&2
    exit 1
  }
fi

ssh_ "test -f '$ROOT/releases/$TARGET/index.html'" || {
  echo "!! release '$TARGET' has no index.html — refusing to activate a broken release." >&2
  exit 1
}

echo "==> Rolling back: $CURRENT -> $TARGET"
ssh_ "cd '$ROOT' && ln -sfn 'releases/$TARGET' current.tmp && mv -Tf current.tmp current && readlink current"

echo "==> Verifying"
fail=0
for path in / /about/ /projects/ /notes/ /contact/; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 -H 'Cache-Control: no-cache' "${SITE}${path}?r=${TARGET}")
  printf '    %-16s %s\n' "$path" "$code"
  [ "$code" = "200" ] || fail=1
done

[ "$fail" = "0" ] || { echo "!! rollback verification failed — the site is still not healthy." >&2; exit 1; }
echo "==> Rolled back to $TARGET"
