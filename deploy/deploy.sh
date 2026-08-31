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
SITE="https://miraddo.com"
KEEP=5   # releases to retain for rollback
SSH_OPTS=(-o ConnectTimeout=20 -i "$KEY")

cd "$(dirname "$0")/.."
ssh_() { ssh "${SSH_OPTS[@]}" "$SERVER" "$@"; }

# Computed BEFORE the build so it can be stamped into every page.
RELEASE="$(date +%Y%m%d-%H%M%S)"

echo "==> Type checking"
npm run check

echo "==> Testing"
npm test

echo "==> Building release $RELEASE"
MIRADDO_RELEASE="$RELEASE" npm run build

if [ ! -f dist/index.html ]; then
  echo "!! dist/index.html missing — refusing to deploy an empty build" >&2
  exit 1
fi
grep -q "content=\"$RELEASE\"" dist/index.html || {
  echo "!! release stamp missing from the build — verification would be blind" >&2
  exit 1
}

echo "==> Checking internal links"
node deploy/check-links.mjs

echo "==> Checking external links (non-fatal)"
node deploy/check-external.mjs || true

echo "==> Uploading"
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
ssh_ "cd '$ROOT/releases' && ls -1 | sort -r | tail -n +$((KEEP + 1)) | xargs -r rm -rf; ls -1 | sort -r | head -$KEEP"

echo "==> Verifying"
# Routes come from the sitemap, so new pages are covered automatically instead
# of drifting from a hardcoded list.
mapfile -t PATHS < <(
  grep -o '<loc>[^<]*</loc>' dist/sitemap-0.xml \
    | sed -e 's|</\?loc>||g' -e "s|^$SITE||" \
    | sed 's|^$|/|'
)
PATHS+=("/rss.xml" "/og.png")

fail=0
for path in "${PATHS[@]}"; do
  # Cache-bust so the edge cannot answer with the previous release.
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 -H 'Cache-Control: no-cache' "${SITE}${path}?r=${RELEASE}")

  case "$path" in
    # Only HTML carries the stamp. Never read a binary body into a shell
    # variable — command substitution strips null bytes and warns.
    *.xml|*.png|*.svg|*.txt|*.woff2)
      stamped="n/a" ;;
    *)
      if curl -s -m 20 -H 'Cache-Control: no-cache' "${SITE}${path}?r=${RELEASE}"         | grep -q "content=\"$RELEASE\""; then stamped="ok"; else stamped="STALE"; fi ;;
  esac

  printf '    %-24s %s  release=%s\n' "$path" "$code" "$stamped"
  { [ "$code" = "200" ] && [ "$stamped" != "STALE" ]; } || fail=1
done

# A 404 must still be a 404, not a soft 200.
nf=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "${SITE}/definitely-not-a-page-${RELEASE}")
printf '    %-24s %s\n' "(404 probe)" "$nf"
[ "$nf" = "404" ] || fail=1

if [ "$fail" = "1" ]; then
  echo "!! verification failed. Roll back with: ./deploy/rollback.sh" >&2
  exit 1
fi

echo "==> Done. $SITE  (release $RELEASE)"
