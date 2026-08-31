#!/usr/bin/env bash
# Build and ship miraddo.com.
#
#   ./deploy/deploy.sh
#
# Layout on the server:
#
#   /opt/miraddo/releases/<timestamp>/   one directory per deploy
#   /opt/miraddo/current -> releases/…   RELATIVE symlink to the live release
#
# Caddy bind-mounts the PARENT (/opt/miraddo -> /srv/miraddo-root:ro) and serves
# /srv/miraddo-root/current.
#
# Why the parent, and why a symlink: a bind mount is resolved to an inode when
# the container starts. Replacing the mounted directory itself — the obvious
# `mv new old` atomic swap — leaves the container pointing at the old, now
# deleted, inode and every request 404s until the container is recreated. The
# mounted inode (/opt/miraddo) must never change; only the symlink inside it
# moves. That swap is atomic and needs no restart, no reload, no downtime.
#
# The symlink must be RELATIVE: /opt/miraddo does not exist inside the container,
# so an absolute target would dangle there.
set -euo pipefail

SERVER="${MIRADDO_SERVER:-root@65.109.219.238}"
KEY="${MIRADDO_SSH_KEY:-$HOME/.ssh/fluentx}"
ROOT="/opt/miraddo"
KEEP=5   # releases to retain for rollback
SSH_OPTS=(-o ConnectTimeout=20 -i "$KEY")

cd "$(dirname "$0")/.."
ssh_() { ssh "${SSH_OPTS[@]}" "$SERVER" "$@"; }

echo "==> Building"
npm run build

if [ ! -f dist/index.html ]; then
  echo "!! dist/index.html missing — refusing to deploy an empty build" >&2
  exit 1
fi

echo "==> Checking internal links"
node deploy/check-links.mjs

echo "==> Checking external links (non-fatal)"
node deploy/check-external.mjs || true

RELEASE="$(date +%Y%m%d-%H%M%S)"
echo "==> Uploading release $RELEASE"
ssh_ "mkdir -p '$ROOT/releases/$RELEASE'"
tar -cz -C dist . | ssh_ "tar -xz -C '$ROOT/releases/$RELEASE'"

# Refuse to point the symlink at a release that did not upload cleanly.
ssh_ "test -f '$ROOT/releases/$RELEASE/index.html'" || {
  echo "!! upload incomplete — leaving the current release in place" >&2
  ssh_ "rm -rf '$ROOT/releases/$RELEASE'"
  exit 1
}

echo "==> Activating (atomic symlink swap, no restart)"
ssh_ "cd '$ROOT' && ln -sfn 'releases/$RELEASE' current.tmp && mv -Tf current.tmp current && readlink current"

echo "==> Pruning old releases (keeping $KEEP)"
ssh_ "cd '$ROOT/releases' && ls -1t | tail -n +$((KEEP + 1)) | xargs -r rm -rf; ls -1t | head -$KEEP"

echo "==> Verifying"
fail=0
for path in / /about/ /now/ /projects/ /notes/ /uses/ /contact/ /rss.xml /og.png; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "https://miraddo.com${path}")
  printf '    %-16s %s\n' "$path" "$code"
  [ "$code" = "200" ] || fail=1
done

if [ "$fail" = "1" ]; then
  echo "!! verification failed. Roll back with:" >&2
  echo "   ssh -i $KEY $SERVER \"cd $ROOT && ls -1t releases | sed -n 2p | xargs -I{} ln -sfn releases/{} current\"" >&2
  exit 1
fi

echo "==> Done. https://miraddo.com"
