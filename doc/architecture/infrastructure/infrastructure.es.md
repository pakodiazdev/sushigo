# Arquitectura de Infraestructura — SushiGo

## 1. Alcance

Este documento describe la infraestructura de despliegue, la estrategia de ramas y el pipeline CI/CD de la plataforma SushiGo. Cubre el estado actual y el pipeline automatizado objetivo que se implementa mediante los tasks #040–#046.

---

## 2. Ambientes

| Ambiente | URL | Rama fuente | Trigger de despliegue |
|----------|-----|------------|----------------------|
| **Preview** | `preview.sushigo-romita.com` | `feature/*` | Manual — desde la feature branch tras pasar el review del PR |
| **Producción** | `admin.sushigo-romita.com` | `main` | Automático — después de que el pipeline CI completo pase en el merge a `main` |

---

## 3. Estrategia de Ramas

| Rama | Propósito |
|------|-----------|
| `main` | Producción — siempre desplegable, protegida |
| `feature/*` | Una rama por task — convención: `feature/NNN-descripcion-corta` |

**Reglas:**
- Sin commits directos a `main`
- Cada feature parte de `main` como una rama nueva
- Las ramas de feature se despliegan en preview para QA manual antes de autorizar el merge
- El merge a `main` lanza el pipeline CI completo y, en caso de éxito, el despliegue automático a producción

---

## 4. Flujo de Desarrollo y Despliegue

```mermaid
flowchart TD
    BACKLOG[📋 Backlog\nTomar task #NNN]
    BRANCH[🌿 Crear rama\nfeature/NNN-descripcion]
    DEV[💻 Desarrollar y\nsubir cambios]
    PR[📬 Abrir Pull Request]

    subgraph Quality Gate en PR
        LINT_PHP_PR[🎨 PHP Pint\nverificación de formato]
        LINT_JS_PR[🎨 ESLint\n+ TypeScript check]
        TEST_PHP_PR[✅ PHPUnit\n+ coverage]
        TEST_JS_PR[✅ Vitest\n+ coverage]
        SONAR_PR[🔍 SonarCloud\nquality gate]
    end

    REVIEW[👤 Review del PR\nDev + Dervi + Copilot]
    OBSERVATIONS{¿Observaciones?}
    FIX[🔧 Atender observaciones\nactualizar PR]
    PREVIEW_DEPLOY[🚀 Despliegue manual\na preview]
    PREVIEW_URL[🌐 preview.sushigo-romita.com\nCloud Run + Supabase]
    QA[🧪 QA manual\ntesting y demo]
    QA_PASS{¿QA pasó?}
    AUTHORIZE[✅ Autorizar merge]
    MERGE[🔀 Merge a main]

    subgraph CI en main
        LINT_PHP_M[🎨 PHP Pint]
        LINT_JS_M[🎨 ESLint + TypeScript]
        TEST_PHP_M[✅ PHPUnit\n+ coverage]
        TEST_JS_M[✅ Vitest\n+ coverage]
        SONAR_M[🔍 SonarCloud\nquality gate]
    end

    PROD_DEPLOY[🚀 Despliegue automático\na producción]
    PROD_URL[🌐 admin.sushigo-romita.com\nCloud Run + Supabase]

    BACKLOG --> BRANCH --> DEV --> PR
    PR --> LINT_PHP_PR & LINT_JS_PR & TEST_PHP_PR & TEST_JS_PR
    TEST_PHP_PR & TEST_JS_PR --> SONAR_PR
    LINT_PHP_PR & LINT_JS_PR & SONAR_PR --> REVIEW
    REVIEW --> OBSERVATIONS
    OBSERVATIONS -->|sí| FIX
    FIX --> PR
    OBSERVATIONS -->|no| PREVIEW_DEPLOY
    PREVIEW_DEPLOY --> PREVIEW_URL --> QA --> QA_PASS
    QA_PASS -->|no| FIX
    QA_PASS -->|sí| AUTHORIZE --> MERGE
    MERGE --> LINT_PHP_M & LINT_JS_M & TEST_PHP_M & TEST_JS_M
    TEST_PHP_M & TEST_JS_M --> SONAR_M
    SONAR_M -->|gate pasado| PROD_DEPLOY --> PROD_URL
```

---

## 5. Resumen del Pipeline por Trigger

| Trigger | Qué corre | Propósito |
|---------|-----------|-----------|
| PR abierto / cada push a feature branch | Linters + Tests + Coverage + SonarCloud | Quality gate completo en PR — bloquea el merge en caso de fallo |
| Merge a `main` | Linters + Tests + Coverage + SonarCloud | El mismo pipeline corre de nuevo — bloquea despliegue a producción en fallo |

---

## 6. Detalle de Despliegues

### 6.1 Despliegue a Preview (Manual — desde la feature branch)

Se lanza manualmente después de que el ciclo de review del PR está completo y los linters pasan.

```mermaid
flowchart LR
    FB[Feature branch]
    BUILD[Docker build\nimagen unificada\nAPI + Webapp]
    GAR[Google Artifact Registry]
    CR[Google Cloud Run]
    DB[Supabase\nDB de Preview]
    URL[preview.sushigo-romita.com]

    FB -->|trigger manual| BUILD
    BUILD --> GAR --> CR
    CR --- DB
    CR --> URL
```

### 6.2 Despliegue a Producción (Automático — en éxito del CI completo tras merge a main)

```mermaid
flowchart LR
    MAIN[rama main]
    CI[CI Completo\npasado ✅]
    BUILD[Docker build\nimagen productiva\nAPI + Webapp]
    GAR[Google Artifact Registry]
    CR[Google Cloud Run]
    DB[Supabase\nDB de Producción]
    URL[admin.sushigo-romita.com]

    MAIN --> CI -->|en éxito| BUILD
    BUILD --> GAR --> CR
    CR --- DB
    CR --> URL
```

---

## 7. Archivos de Workflow

| Archivo | Trigger | Filtro de ruta | Pasos |
|---------|---------|---------------|-------|
| `.github/workflows/api-lint.yml` | PR abierto/actualizado + push a `main` | `code/api/**` | PHP Pint `--test` |
| `.github/workflows/webapp-lint.yml` | PR abierto/actualizado + push a `main` | `code/webapp/**` | ESLint + TypeScript check |
| `.github/workflows/api-tests.yml` | PR abierto/actualizado + push a `main` | `code/api/**` | PHPUnit + coverage + análisis SonarCloud |
| `.github/workflows/webapp-tests.yml` | PR abierto/actualizado + push a `main` | `code/webapp/**` | Vitest + coverage + análisis SonarCloud |

---

## 8. Requerimientos

El conjunto completo de requerimientos funcionales (RF), reglas de negocio (RN) y definiciones cerradas (DC) — incluyendo la justificación de cada uno — está documentado en:

📄 [`infrastructure-requirements.es.md`](./infrastructure-requirements.es.md)

---

## 9. Tasks Relacionados

| Task | Issue | Descripción |
|------|-------|-------------|
| Documentación de arquitectura | [#040](https://github.com/pakodiazdev/sushigo/issues/40) | Este documento |
| PHP Pint linter | [#041](https://github.com/pakodiazdev/sushigo/issues/41) | `api-lint.yml` — PR + main |
| ESLint + TypeScript check | [#042](https://github.com/pakodiazdev/sushigo/issues/42) | `webapp-lint.yml` — PR + main |
| PHPUnit + coverage | [#043](https://github.com/pakodiazdev/sushigo/issues/43) | `api-tests.yml` — PR + main |
| Vitest + coverage | [#044](https://github.com/pakodiazdev/sushigo/issues/44) | `webapp-tests.yml` — PR + main |
| SonarCloud | [#045](https://github.com/pakodiazdev/sushigo/issues/45) | Quality gate — PR + main |
| Branch protection | [#046](https://github.com/pakodiazdev/sushigo/issues/46) | Protección de `main` — checks requeridos: los 5 workflows |
