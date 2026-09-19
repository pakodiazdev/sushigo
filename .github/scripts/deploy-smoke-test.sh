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

: "${BASE_URL:?BASE_URL is required}"
: "${SMOKE_TEST_EMAIL:?SMOKE_TEST_EMAIL is required}"
: "${SMOKE_TEST_PASSWORD:?SMOKE_TEST_PASSWORD is required}"

HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-30}"
HEALTH_CHECK_DELAY="${HEALTH_CHECK_DELAY:-5}"

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
  code="$(curl -s -o /tmp/smoke-health.json -w '%{http_code}' "${API_URL}/health" || echo "000")"
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
spa_code="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/")"
if [ "$spa_code" = "200" ]; then
  record ok "SPA availability"
else
  record fail "SPA availability [HTTP ${spa_code}]"
fi

# 3. Login — extract the bearer token for the subsequent authenticated checks.
login_payload="$(jq -n --arg email "$SMOKE_TEST_EMAIL" --arg password "$SMOKE_TEST_PASSWORD" \
  '{email: $email, password: $password}')"
login_response="$(curl -s -w '\n%{http_code}' -X POST "${API_URL}/auth/login" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d "$login_payload")"
login_code="$(tail -n1 <<< "$login_response")"
login_body="$(sed '$d' <<< "$login_response")"
token="$(jq -r '.data.token // empty' <<< "$login_body" 2>/dev/null || true)"

if [ "$login_code" = "200" ] && [ -n "$token" ]; then
  record ok "Login"
else
  record fail "Login [HTTP ${login_code}]"
  token=""
fi

authed_get() {
  local label="$1"
  local path="$2"
  if [ -z "$token" ]; then
    record fail "${label} [skipped — no auth token]"
    return
  fi
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "${API_URL}${path}" \
    -H "Authorization: Bearer ${token}" -H 'Accept: application/json')"
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
