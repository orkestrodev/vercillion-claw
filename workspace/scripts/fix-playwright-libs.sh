#!/usr/bin/env bash
# fix-playwright-libs.sh — make Playwright's Chromium runnable without root.
#
# Problem: on this host chromium's shared-lib deps (libnspr4, libnss3,
# libnssutil3, libsmime3, libasound2) are not installed, and `sudo apt-get
# install` is unavailable (sudo requires an interactive password).
#
# Fix (no root needed, non-destructive):
#   1. `apt-get download` the .deb files (works as a normal user)
#   2. `dpkg -x` them into <browser-dir>/libs
#   3. rename the real binary to <name>.real and drop in a 5-line shell
#      wrapper at the original path that exports LD_LIBRARY_PATH and execs it
#
# Playwright resolves the binary by its original path, so the wrapper is
# transparent to it. Idempotent: safe to run any number of times.
#
# Usage:  bash scripts/fix-playwright-libs.sh [--verify-only]
set -uo pipefail

# NOTE: some sandboxes don't export HOME, so derive a fallback.
USER_HOME="${HOME:-$(getent passwd "$(id -un)" 2>/dev/null | cut -d: -f6)}"
USER_HOME="${USER_HOME:-/home/$(id -un)}"
PW_ROOT="${PLAYWRIGHT_BROWSERS_PATH:-$USER_HOME/.cache/ms-playwright}"
DEB_CACHE="$PW_ROOT/.fix-debs"          # persistent staging (survives reboots)
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# Packages that supply the missing .so files. t64 variants on modern Ubuntu.
PKGS=(libnspr4 libnss3 libasound2t64)

VERIFY_ONLY=0
[[ "${1:-}" == "--verify-only" ]] && VERIFY_ONLY=1

log() { printf '  %s\n' "$*"; }

[[ -d "$PW_ROOT" ]] || { echo "No Playwright cache at $PW_ROOT" >&2; exit 1; }

# --- 1. locate browser dirs + their main executables -------------------------
# name:browserdir:binary
browsers=()
while IFS= read -r d; do
  for pair in "chrome-linux64/chrome" "chrome-headless-shell-linux64/chrome-headless-shell"; do
    [[ -f "$d/$pair" || -f "$d/$pair.real" ]] && browsers+=("$pair::$d")
  done
done < <(find "$PW_ROOT" -maxdepth 1 -type d \( -name 'chromium-*' -o -name 'chromium_headless_shell-*' \) | sort)

if ((${#browsers[@]} == 0)); then
  echo "No chromium browser dirs found under $PW_ROOT" >&2
  exit 1
fi

# --- 2. fetch + extract the debs once (shared by all browser dirs) ----------
fetch_libs() {
  local libs_src="$1"
  if [[ -d "$libs_src" && -n "$(ls -A "$libs_src" 2>/dev/null)" ]]; then
    log "reusing cached libs: $libs_src"
    return 0
  fi
  mkdir -p "$DEB_CACHE" "$libs_src"
  local missing=()
  for p in "${PKGS[@]}"; do
    compgen -G "$DEB_CACHE/${p}_*.deb" >/dev/null || missing+=("$p")
  done
  if ((${#missing[@]})); then
    log "downloading: ${missing[*]}"
    ( cd "$DEB_CACHE" && apt-get download "${missing[@]}" >/dev/null 2>&1 ) || {
      # retry once with the pre-t64 name for libasound
      ( cd "$DEB_CACHE" && apt-get download "${missing[@]/libasound2t64/libasound2}" >/dev/null 2>&1 ) \
        || log "WARN: some downloads failed (offline?)"
    }
  fi
  local root="$STAGE/root"
  mkdir -p "$root"
  for d in "$DEB_CACHE"/*.deb; do
    [[ -f "$d" ]] && dpkg -x "$d" "$root" 2>/dev/null
  done
  cp -a "$root"/usr/lib/*-linux-gnu*/*.so* "$libs_src"/ 2>/dev/null
  log "extracted $(ls "$libs_src" | wc -l) libs -> $libs_src"
}

# --- 3. wrap + verify each browser -----------------------------------------
rc=0
for entry in "${browsers[@]}"; do
  rel="${entry%%::*}"; dir="${entry##*::}"
  binname="$(basename "$rel")"
  target="$dir/$rel"
  bindir="$(dirname "$target")"        # libs must sit next to the binary
  echo "[$(basename "$dir")/$binname]"

  if ((!VERIFY_ONLY)); then
    # already wrapped? (wrapper is a small shell script, real binary is huge)
    if [[ -f "$target" ]] && head -c 2 "$target" 2>/dev/null | grep -q '#!'; then
      log "already wrapped — refreshing libs only"
    else
      [[ -f "$target.real" ]] || mv "$target" "$target.real"
      cat > "$target" <<'WRAP'
#!/bin/sh
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export LD_LIBRARY_PATH="$DIR/libs:${LD_LIBRARY_PATH}"
exec "$DIR/$(basename "$0").real" "$@"
WRAP
      chmod +x "$target"
      log "wrapper installed: $rel"
    fi
    fetch_libs "$bindir/libs"
  fi

  # verify
  if [[ ! -f "$target.real" && ! -f "$target" ]]; then
    log "MISSING binary"; rc=1; continue
  fi
  real="${target}.real"; [[ -f "$real" ]] || real="$target"
  unresolved="$(LD_LIBRARY_PATH="$bindir/libs${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
                 ldd "$real" 2>/dev/null | grep 'not found' | awk '{print $1}' | sort -u | tr '\n' ' ')"
  if [[ -n "$unresolved" ]]; then
    log "STILL MISSING: $unresolved"; rc=1
  else
    # actually execute it — ldd can pass while dlopen at runtime still fails
    out="$("$target" --version 2>&1 | tr -d '\r')"
    if grep -qiE 'error while loading|not found|cannot open shared' <<<"$out"; then
      log "EXEC FAILED: $(head -1 <<<"$out" | cut -c1-160)"; rc=1
    else
      log "OK — $(head -1 <<<"$out")"
    fi
  fi
done

echo
if ((rc == 0)); then
  echo "✅ All chromium binaries runnable."
else
  echo "⚠️  Some binaries still have unresolved libs (see above)." >&2
fi
exit "$rc"
