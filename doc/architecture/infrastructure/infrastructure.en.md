# Infrastructure Architecture — SushiGo

## 1. Scope

This document describes the deployment infrastructure, branch strategy, and CI/CD pipeline for the SushiGo platform. It covers the current state and the target automated pipeline being implemented via tasks #040–#046.

---

## 2. Environments

| Environment | URL | Source branch | Deploy trigger |
|-------------|-----|--------------|---------------|
| **Preview** | `preview.sushigo-romita.com` | `feature/*` | Manual — from feature branch after PR review passes |
| **Production** | `admin.sushigo-romita.com` | `main` | Automatic — after full CI pipeline passes on merge to `main` |

---

## 3. Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — always deployable, protected |
| `feature/*` | One branch per task — naming convention: `feature/NNN-short-description` |

**Rules:**
- No direct commits to `main`
- Every feature starts from `main` as a fresh branch
- Feature branches are deployed to preview for manual QA before merge is authorized
- Merge to `main` triggers the full CI pipeline and, on success, automatic production deployment

---

## 4. Development and Deployment Flow

```mermaid
flowchart TD
    BACKLOG[📋 Backlog\nPick task #NNN]
    BRANCH[🌿 Create branch\nfeature/NNN-description]
    DEV[💻 Develop &\npush changes]
    PR[📬 Open Pull Request]

    subgraph PR Quality Gate
        LINT_PHP_PR[🎨 PHP Pint\nformat check]
        LINT_JS_PR[🎨 ESLint\n+ TypeScript check]
        TEST_PHP_PR[✅ PHPUnit\n+ coverage]
        TEST_JS_PR[✅ Vitest\n+ coverage]
        SONAR_PR[🔍 SonarCloud\nquality gate]
    end

    REVIEW[👤 PR Review\nDev + Dervi + Copilot]
    OBSERVATIONS{Observations?}
    FIX[🔧 Address observations\nupdate PR]
    PREVIEW_DEPLOY[🚀 Manual deploy\nto preview]
    PREVIEW_URL[🌐 preview.sushigo-romita.com\nCloud Run + Supabase]
    QA[🧪 Manual QA\ntesting & demo]
    QA_PASS{QA passed?}
    AUTHORIZE[✅ Authorize merge]
    MERGE[🔀 Merge to main]

    subgraph CI on main
        LINT_PHP_M[🎨 PHP Pint]
        LINT_JS_M[🎨 ESLint + TypeScript]
        TEST_PHP_M[✅ PHPUnit\n+ coverage]
        TEST_JS_M[✅ Vitest\n+ coverage]
        SONAR_M[🔍 SonarCloud\nquality gate]
    end

    PROD_DEPLOY[🚀 Automatic deploy\nto production]
    PROD_URL[🌐 admin.sushigo-romita.com\nCloud Run + Supabase]

    BACKLOG --> BRANCH --> DEV --> PR
    PR --> LINT_PHP_PR & LINT_JS_PR & TEST_PHP_PR & TEST_JS_PR
    TEST_PHP_PR & TEST_JS_PR --> SONAR_PR
    LINT_PHP_PR & LINT_JS_PR & SONAR_PR --> REVIEW
    REVIEW --> OBSERVATIONS
    OBSERVATIONS -->|yes| FIX
    FIX --> PR
    OBSERVATIONS -->|no| PREVIEW_DEPLOY
    PREVIEW_DEPLOY --> PREVIEW_URL --> QA --> QA_PASS
    QA_PASS -->|no| FIX
    QA_PASS -->|yes| AUTHORIZE --> MERGE
    MERGE --> LINT_PHP_M & LINT_JS_M & TEST_PHP_M & TEST_JS_M
    TEST_PHP_M & TEST_JS_M --> SONAR_M
    SONAR_M -->|gate passed| PROD_DEPLOY --> PROD_URL
```

---

## 5. Pipeline Summary by Trigger

| Trigger | Runs | Purpose |
|---------|------|---------|
| PR open / every push to feature branch | Linters + Tests + Coverage + SonarCloud | Full quality gate on PR — blocks merge on failure |
| Merge to `main` | Linters + Tests + Coverage + SonarCloud | Same pipeline re-runs — blocks production deploy on failure |

---

## 6. Deployment Details

### 6.1 Preview Deployment (Manual — from feature branch)

Triggered manually after the PR review cycle is complete and linters pass.

```mermaid
flowchart LR
    FB[Feature branch]
    BUILD[Docker build\nunified image\nAPI + Webapp]
    GAR[Google Artifact Registry]
    CR[Google Cloud Run]
    DB[Supabase\nPreview DB]
    URL[preview.sushigo-romita.com]

    FB -->|manual trigger| BUILD
    BUILD --> GAR --> CR
    CR --- DB
    CR --> URL
```

### 6.2 Production Deployment (Automatic — on full CI success after merge to main)

```mermaid
flowchart LR
    MAIN[main branch]
    CI[Full CI\npassed ✅]
    BUILD[Docker build\nproduction image\nAPI + Webapp]
    GAR[Google Artifact Registry]
    CR[Google Cloud Run]
    DB[Supabase\nProduction DB]
    URL[admin.sushigo-romita.com]

    MAIN --> CI -->|on success| BUILD
    BUILD --> GAR --> CR
    CR --- DB
    CR --> URL
```

---

## 7. Workflow Files

| File | Trigger | Path filter | Steps |
|------|---------|------------|-------|
| `.github/workflows/api-lint.yml` | PR open/update + push to `main` | `code/api/**` | PHP Pint `--test` |
| `.github/workflows/webapp-lint.yml` | PR open/update + push to `main` | `code/webapp/**` | ESLint + TypeScript check |
| `.github/workflows/api-tests.yml` | PR open/update + push to `main` | `code/api/**` | PHPUnit + coverage → upload `coverage.xml` artifact |
| `.github/workflows/webapp-tests.yml` | PR open/update + push to `main` | `code/webapp/**` | Vitest + coverage + SonarCloud analysis |

---

## 8. Requirements

The full set of functional requirements (RF), business rules (RN), and closed definitions (DC) — including justification for each — is documented in:

📄 [`infrastructure-requirements.en.md`](./infrastructure-requirements.en.md)

---

## 9. Related Tasks

| Task | Issue | Description |
|------|-------|-------------|
| Architecture docs | [#040](https://github.com/pakodiazdev/sushigo/issues/40) | This document |
| PHP Pint linter | [#041](https://github.com/pakodiazdev/sushigo/issues/41) | `api-lint.yml` — PR + main |
| ESLint + TypeScript check | [#042](https://github.com/pakodiazdev/sushigo/issues/42) | `webapp-lint.yml` — PR + main |
| PHPUnit + coverage | [#043](https://github.com/pakodiazdev/sushigo/issues/43) | `api-tests.yml` — PR + main |
| Vitest + coverage | [#044](https://github.com/pakodiazdev/sushigo/issues/44) | `webapp-tests.yml` — PR + main |
| SonarCloud | [#045](https://github.com/pakodiazdev/sushigo/issues/45) | Quality gate — PR + main |
| Branch protection | [#046](https://github.com/pakodiazdev/sushigo/issues/46) | `main` protection — required checks: all 5 workflows |
