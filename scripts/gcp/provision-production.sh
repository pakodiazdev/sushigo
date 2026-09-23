#!/usr/bin/env bash
#
# One-time, idempotent provisioning of the Production GCP project for SushiGo Admin (#636, per
# TD-07 — doc/decisions/td-07-environment-release-promotion-contract.md). Creates everything
# .github/workflows/deploy-production.yml and production-rollback.yml expect to exist:
#
#   - project `sushigo-prod` (linked to a billing account) and the APIs it needs
#   - the three per-project identities TD-07 requires:
#       gha-sushigo-prod@…            deploy SA, reached from GitHub Actions via WIF (main only)
#       Cloud Run service agent       artifactregistry.reader on sushigo-app's registry repo
#       sushigo-prod-runtime@…        runtime SA, secretAccessor on Production's own secrets only
#   - empty PROD_* Secret Manager secrets (values are added by a human, never by this script)
#
# It does NOT create the database, add secret values, map the domain (needs the service to exist —
# i.e. after the first release), or touch GitHub settings; it prints those remaining manual steps.
# See doc/conventions/ci/deployment.md → "Production pipeline → Provisioning runbook".
#
# Dry-run by default: prints every gcloud command without running it. Pass --apply to execute.
#
# Usage:
#   BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX ./scripts/gcp/provision-production.sh            # dry run
#   BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX ./scripts/gcp/provision-production.sh --apply
#
# Optional env: REGION (us-central1), SOURCE_PROJECT (sushigo-app), AR_LOCATION (us),
#               AR_REPO (gcr.io), GITHUB_REPO (pakodiazdev/sushigo)

set -euo pipefail

APPLY="false"
if [ "${1:-}" = "--apply" ]; then
  APPLY="true"
elif [ -n "${1:-}" ]; then
  echo "Usage: BILLING_ACCOUNT=<id> $0 [--apply]"
  exit 1
fi

BILLING_ACCOUNT="${BILLING_ACCOUNT:-}"
if [ -z "$BILLING_ACCOUNT" ]; then
  echo "Usage: BILLING_ACCOUNT=<id> $0 [--apply]"
  echo "Example: BILLING_ACCOUNT=012345-6789AB-CDEF01 $0"
  exit 1
fi

if ! command -v gcloud &>/dev/null; then
  echo "❌ Error: gcloud not found. Install the Google Cloud CLI first."
  exit 1
fi

PROJECT_ID="sushigo-prod"
REGION="${REGION:-us-central1}"
SOURCE_PROJECT="${SOURCE_PROJECT:-sushigo-app}"
AR_LOCATION="${AR_LOCATION:-us}"
AR_REPO="${AR_REPO:-gcr.io}"
GITHUB_REPO="${GITHUB_REPO:-pakodiazdev/sushigo}"
DEPLOY_SA="gha-sushigo-prod@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA="sushigo-prod-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
SECRETS=(PROD_APP_KEY PROD_DB_HOST PROD_DB_DATABASE PROD_DB_USER PROD_DB_PASS PROD_OAUTH_PRIVATE PROD_OAUTH_PUBLIC
  PROD_SEEDER_ADMIN_PASSWORD PROD_SEEDER_EMPLOYEE_PASSWORD PROD_SEEDER_INVENTORY_PASSWORD)

run() {
  echo "+ $*"
  if [ "$APPLY" = "true" ]; then
    "$@"
  fi
}

# Runs the create command only when the describe command fails (resource absent).
ensure() {
  local describe="$1"
  shift
  if [ "$APPLY" = "true" ] && eval "$describe" &>/dev/null; then
    echo "= already exists: $describe"
    return 0
  fi
  run "$@"
}

echo "== Provisioning ${PROJECT_ID} (apply=${APPLY}) =="

ensure "gcloud projects describe ${PROJECT_ID}" \
  gcloud projects create "$PROJECT_ID" --name "SushiGo Production"
run gcloud billing projects link "$PROJECT_ID" --billing-account "$BILLING_ACCOUNT"
run gcloud services enable --project "$PROJECT_ID" \
  run.googleapis.com secretmanager.googleapis.com iam.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com artifactregistry.googleapis.com

if [ "$APPLY" = "true" ]; then
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
else
  PROJECT_NUMBER="<project-number>"
fi
RUN_AGENT="service-${PROJECT_NUMBER}@serverless-robot-prod.iam.gserviceaccount.com"

echo "-- Identities --"
ensure "gcloud iam service-accounts describe ${DEPLOY_SA} --project ${PROJECT_ID}" \
  gcloud iam service-accounts create gha-sushigo-prod --project "$PROJECT_ID" \
  --display-name "GitHub Actions deploy (Production)"
ensure "gcloud iam service-accounts describe ${RUNTIME_SA} --project ${PROJECT_ID}" \
  gcloud iam service-accounts create sushigo-prod-runtime --project "$PROJECT_ID" \
  --display-name "Cloud Run runtime (Production)"

# Deploy SA: manage the Cloud Run service, migration job and traffic, and act as the runtime SA.
run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${DEPLOY_SA}" --role roles/run.admin --condition=None
run gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" --project "$PROJECT_ID" \
  --member "serviceAccount:${DEPLOY_SA}" --role roles/iam.serviceAccountUser

# Cloud Run service agent pulls the prod-cloudrun image from sushigo-app's registry (repo-scoped).
run gcloud beta services identity create --service run.googleapis.com --project "$PROJECT_ID"
run gcloud artifacts repositories add-iam-policy-binding "$AR_REPO" \
  --project "$SOURCE_PROJECT" --location "$AR_LOCATION" \
  --member "serviceAccount:${RUN_AGENT}" --role roles/artifactregistry.reader

echo "-- Workload Identity Federation (GitHub Actions, main branch of ${GITHUB_REPO} only) --"
ensure "gcloud iam workload-identity-pools describe github-pool --project ${PROJECT_ID} --location global" \
  gcloud iam workload-identity-pools create github-pool --project "$PROJECT_ID" --location global \
  --display-name "GitHub Actions"
ensure "gcloud iam workload-identity-pools providers describe github-provider --workload-identity-pool github-pool --project ${PROJECT_ID} --location global" \
  gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project "$PROJECT_ID" --location global --workload-identity-pool github-pool \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition "assertion.repository == '${GITHUB_REPO}' && assertion.ref == 'refs/heads/main'"
run gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_REPO}"

echo "-- Secrets (created empty; add values by hand) --"
for secret in "${SECRETS[@]}"; do
  ensure "gcloud secrets describe ${secret} --project ${PROJECT_ID}" \
    gcloud secrets create "$secret" --project "$PROJECT_ID" --replication-policy automatic
  run gcloud secrets add-iam-policy-binding "$secret" --project "$PROJECT_ID" \
    --member "serviceAccount:${RUNTIME_SA}" --role roles/secretmanager.secretAccessor
done

cat <<EOF

✅ Done (apply=${APPLY}). Remaining manual steps — see doc/conventions/ci/deployment.md:

1. Provision the isolated Production PostgreSQL database (never shared with QA or Demo) and add
   secret values:
     printf '%s' "<value>" | gcloud secrets versions add PROD_DB_HOST --project ${PROJECT_ID} --data-file=-
   for each of: ${SECRETS[*]}
   (APP_KEY: 'php artisan key:generate --show'; OAuth pair: 'php artisan passport:keys' output files)
2. GitHub repository variables:
     gh variable set PROD_GCP_PROJECT_NUMBER --body ${PROJECT_NUMBER}
     gh variable set PROD_GCP_REGION --body ${REGION}
3. GitHub Environment 'production': add required reviewers (initial-adoption approval gate), var
   SMOKE_TEST_EMAIL and secret SMOKE_TEST_PASSWORD for a dedicated Production smoke user.
4. Enable the pipeline:  gh variable set PRODUCTION_DEPLOY_ENABLED --body true
   Bootstrap the first release by hand, seeding reference data once (approve it in the Actions UI):
     gh workflow run deploy-production.yml -f ci_run_id=<latest green CI run on main> -f seed_reference_data=true
5. After the first release created the service, map the domain (HTTPS certificate is automatic):
     gcloud beta run domain-mappings create --service sushigo-prod --domain admin.sushigo-romita.com \\
       --project ${PROJECT_ID} --region ${REGION}
   and add the DNS records it prints for sushigo-romita.com.
EOF
