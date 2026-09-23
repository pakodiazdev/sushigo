#!/usr/bin/env bash
set -euo pipefail

# Deployment smoke test (#634, per TD-07 / doc/conventions/ci/deployment.md).
#
# Hits a freshly-deployed environment's public surface to confirm the API is reachable, the SPA
# serves, and a minimal authenticated read flow works end-to-end. Used by deploy-preview.yml today;
# written environment-agnostically (BASE_URL + credentials passed in via env vars, nothing QA-
# specific hardcoded) so Demo/Production (#635/#636) can reuse it against their own URLs later.
#
# Required env vars:
#   BASE_URL             e.g. https://preview.sushigo-romita.com
#   SMOKE_TEST_EMAIL      an existing user's email in the target environment
#   SMOKE_TEST_PASSWORD   that user's password
#
# Optional env vars:
#   HEALTH_CHECK_RETRIES  attempts for the health check's retry loop (default 30)
#   HEALTH_CHECK_DELAY    seconds between health check attempts (default 5)
#
# Exits non-zero if any check fails. Appends a Markdown summary to $GITHUB_STEP_SUMMARY when set.
#
# Every curl call that feeds a variable carries an `|| echo "000"` (or equivalent) fallback (Codex
# finding, 2026-09-20): under `set -e`, a transport-level curl failure (DNS, TLS, connection
# refused — not just a non-2xx HTTP status) exits the whole script at that assignment, before
# `record` or the final summary ever run. That would turn exactly the network failures this suite
# exists to catch into a crashed run with no per-check report instead of a clean ❌.
#
# Every curl call also carries `--max-time` (second Codex finding, 2026-09-20): a server that
# accepts a connection but never responds isn't caught by the fallback above (curl itself is still
# running, not failed) — without a bound, one stalled request could occupy the runner until
# GitHub's own job time limit instead of producing the promised per-check failure.

: "${BASE_URL:?BASE_URL is required}"
: "${SMOKE_TEST_EMAIL:?SMOKE_TEST_EMAIL is required}"
: "${SMOKE_TEST_PASSWORD:?SMOKE_TEST_PASSWORD is required}"

HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-30}"
HEALTH_CHECK_DELAY="${HEALTH_CHECK_DELAY:-5}"
CURL_MAX_TIME="${CURL_MAX_TIME:-10}"

BASE_URL="${BASE_URL%/}"
API_URL="${BASE_URL}/api/v1"
FAILURES=0
RESULTS=()

record() {
  local outcome="$1"
  local label="$2"
  if [ "$outcome" = "ok" ]; then
    RESULTS+=("✅ ${label}")
  else
    RESULTS+=("❌ ${label}")
    FAILURES=$((FAILURES + 1))
  fi
}

echo "== Deployment smoke test against ${BASE_URL} =="

# 1. API health — retried, since the revision may still be starting up right after deploy.
echo "-- API health (${API_URL}/health) --"
health_ok=""
for attempt in $(seq 1 "$HEALTH_CHECK_RETRIES"); do
  code="$(curl -s --max-time "${CURL_MAX_TIME}" -o /tmp/smoke-health.json -w '%{http_code}' "${API_URL}/health" || echo "000")"
  if [ "$code" = "200" ]; then
    echo "  attempt ${attempt}: HTTP ${code} — healthy"
    health_ok="yes"
    break
  fi
  echo "  attempt ${attempt}: HTTP ${code}, retrying in ${HEALTH_CHECK_DELAY}s..."
  sleep "$HEALTH_CHECK_DELAY"
done
if [ -n "$health_ok" ]; then
  record ok "API health"
else
  cat /tmp/smoke-health.json 2>/dev/null || true
  record fail "API health [did not become healthy after ${HEALTH_CHECK_RETRIES} attempts]"
fi

# 2. SPA availability
spa_code="$(curl -s --max-time "${CURL_MAX_TIME}" -o /dev/null -w '%{http_code}' "${BASE_URL}/" || echo "000")"
if [ "$spa_code" = "200" ]; then
  record ok "SPA availability"
else
  record fail "SPA availability [HTTP ${spa_code}]"
fi

# 3. Login — extract the bearer token for the subsequent authenticated checks.
login_payload="$(jq -n --arg email "$SMOKE_TEST_EMAIL" --arg password "$SMOKE_TEST_PASSWORD" \
  '{email: $email, password: $password}')"
login_response="$(curl -s --max-time "${CURL_MAX_TIME}" -w '\n%{http_code}' -X POST "${API_URL}/auth/login" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d "$login_payload" || printf '\n000')"
login_code="$(tail -n1 <<< "$login_response")"
login_body="$(sed '$d' <<< "$login_response")"
token="$(jq -r '.data.token // empty' <<< "$login_body" 2>/dev/null || true)"

if [ "$login_code" = "200" ] && [ -n "$token" ]; then
  record ok "Login"
else
  record fail "Login [HTTP ${login_code}]"
  token=""
fi

# Revoke the smoke-test token on every exit path (Codex finding, 2026-09-23): the login endpoint
# issues a new Passport personal access token on every successful request, and nothing else in
# this script called /auth/logout — every deployment left one more permanently-active
# oauth_access_tokens row for the smoke user. An EXIT trap (not just a call at the end of the
# script) covers failures in the authenticated checks below too. `local exit_code` captures the
# script's real exit status before the cleanup curl call can touch it, and the trailing `exit`
# re-asserts that status so a revoke failure can never mask (or fake) the actual smoke-test result.
cleanup() {
  local exit_code=$?
  if [ -n "$token" ]; then
    curl -s --max-time "${CURL_MAX_TIME}" -o /dev/null -X POST "${API_URL}/auth/logout" \
      -H "Authorization: Bearer ${token}" -H 'Accept: application/json' || true
  fi
  exit "$exit_code"
}
trap cleanup EXIT

authed_get() {
  local label="$1"
  local path="$2"
  if [ -z "$token" ]; then
    record fail "${label} [skipped — no auth token]"
    return
  fi
  local code
  code="$(curl -s --max-time "${CURL_MAX_TIME}" -o /dev/null -w '%{http_code}' "${API_URL}${path}" \
    -H "Authorization: Bearer ${token}" -H 'Accept: application/json' || echo "000")"
  if [ "$code" = "200" ]; then
    record ok "$label"
  else
    record fail "${label} [HTTP ${code}]"
  fi
}

authed_get "Current user (/auth/me)" "/auth/me"
authed_get "Employees list" "/employees"
authed_get "Items list (Products)" "/items"
authed_get "Stock list (Inventory)" "/stock"

echo ""
printf '%s\n' "${RESULTS[@]}"

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### 🧪 Deployment smoke test — ${BASE_URL}"
    echo ""
    printf -- '- %s\n' "${RESULTS[@]}"
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [ "$FAILURES" -gt 0 ]; then
  echo ""
  echo "❌ ${FAILURES} smoke check(s) failed"
  exit 1
fi

echo ""
echo "✅ All smoke checks passed"
