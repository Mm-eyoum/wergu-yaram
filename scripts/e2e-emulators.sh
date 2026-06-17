#!/usr/bin/env bash
#
# Runs the AUTH + WRITE E2E flows (e2e-emu/) against the Firebase emulators so
# they never touch production data. Steps:
#   1. ensure a JDK 21+ is on PATH (Firestore emulator requirement),
#   2. build the app with VITE_USE_EMULATORS=true (SDKs → localhost emulators),
#   3. boot Auth + Firestore emulators and run the Playwright emulator config.
#
# Usage: npm run e2e:emu   (or: bash scripts/e2e-emulators.sh)
set -euo pipefail
cd "$(dirname "$0")/.."

# --- JDK 21+ (Firestore emulator no longer supports Java < 21) ---
java_ok() { "$1/bin/java" -version 2>&1 | grep -qE '"(2[1-9]|[3-9][0-9])\.'; }
if [ -z "${JAVA_HOME:-}" ] || ! java_ok "${JAVA_HOME:-/nonexistent}"; then
  for d in /opt/homebrew/opt/openjdk@21 /usr/local/opt/openjdk@21 \
           /opt/homebrew/opt/openjdk /usr/local/opt/openjdk \
           /usr/lib/jvm/java-21-openjdk /usr/lib/jvm/java-21; do
    if [ -x "$d/bin/java" ] && java_ok "$d"; then export JAVA_HOME="$d"; break; fi
  done
fi
if [ -z "${JAVA_HOME:-}" ] || ! java_ok "$JAVA_HOME"; then
  echo "ERROR: a JDK 21+ is required by the Firestore emulator. Install one (e.g. 'brew install openjdk@21') or set JAVA_HOME." >&2
  exit 1
fi
export PATH="$JAVA_HOME/bin:$PATH"
echo "→ JAVA_HOME=$JAVA_HOME ($(java -version 2>&1 | head -1))"

echo "→ Building app wired to the emulators (VITE_USE_EMULATORS=true)…"
VITE_USE_EMULATORS=true npm run build

echo "→ Booting Auth + Firestore emulators and running the E2E flows…"
npx firebase-tools emulators:exec --only auth,firestore --project werguyaram \
  "npx playwright test --config playwright.emulators.config.ts"
