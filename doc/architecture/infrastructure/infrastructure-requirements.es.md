# Requerimientos de Infraestructura CI/CD — SushiGo

**Versión:** 1.0
**Fecha:** 2026-02-27
**Estado:** Activo
**Relacionado con:** Tasks #040–#046 · Doc de arquitectura `infrastructure.es.md`

---

## PARTE A — Contexto y Justificación

### 1) El problema que queremos resolver

SushiGo es una plataforma productiva que maneja datos críticos del negocio: registros diarios de asistencia, sesiones de caja y movimientos de inventario. A medida que el código crece — hoy con más de 23 modelos, 40+ endpoints de API y dos subproyectos (API + Webapp) — el riesgo de enviar una regresión o una inconsistencia de formato aumenta con cada pull request.

El proceso de desarrollo actual depende completamente del juicio manual: el desarrollador lee el código, corre los tests localmente (o no) y decide si hace merge. Esto funciona cuando hay un solo desarrollador siempre disponible y siempre disciplinado — pero no escala, es invisible para colaboradores externos y no es de nivel portafolio.

El objetivo de este documento de requerimientos es definir los quality gates automatizados que protegen `main` de código roto o inconsistente, sin introducir tanta fricción que ralentice el ciclo de desarrollo.

---

### 2) Cómo funciona en la práctica

#### 2.1 En cada pull request

Cuando un desarrollador abre o actualiza un pull request, **los linters, tests y el análisis de SonarCloud corren inmediata y automáticamente** contra el subproyecto modificado. Esto garantiza que ninguna regresión, violación de formato, error de tipos, code smell o caída de coverage pueda llegar a `main` a través de un pull request. El quality gate bloquea el merge hasta que los cinco checks pasen.

Los revisores humanos (el desarrollador, Dervi y Copilot) revisan el código sabiendo que ya pasaron las verificaciones automatizadas de calidad — se enfocan en lógica y arquitectura, no en atrapar issues que las herramientas pueden encontrar.

#### 2.2 Antes del merge — QA manual en preview

Después de que el ciclo de review del PR está completo y se atienden las observaciones, la feature branch se despliega manualmente en `preview.sushigo-romita.com`. Este ambiente es un espejo de producción (misma infraestructura de Cloud Run, mismo esquema de Supabase) y permite validar la feature end-to-end antes de autorizar el merge.

Si el preview falla — un flujo roto, una migración faltante, una regresión de UI — la rama se corrige y se vuelve a desplegar antes de autorizar el merge. Esto evita que "funcionó en local" se convierta en un incidente de producción.

#### 2.3 Después del merge a `main` — gate de producción

Una vez que la feature está en `main`, el mismo pipeline completo corre de nuevo. Esta re-ejecución es el gate final antes del despliegue a producción — detecta cualquier issue que pueda surgir de conflictos de merge o diferencias de entorno. Si cualquier paso falla en `main`, el despliegue a producción se bloquea.

---

### 3) Roles y responsabilidades

| Rol | Responsabilidad |
|-----|----------------|
| Desarrollador (jfcodiaz) | Es dueño del PR, atiende observaciones, autoriza el merge |
| Dervi | Revisa el PR: errores lógicos, casos borde, alineación con arquitectura |
| GitHub Copilot | Revisión automática: code smell, patrones de seguridad, redundancia |
| Pipeline CI | Enforcement automatizado: formato, tipos, tests, coverage, quality gate |

---

## PARTE B — Requerimientos Técnicos

> Esta sección es la base para configurar los workflows de GitHub Actions, las reglas de protección de rama y SonarCloud.

### 4) Glosario

- **Linter:** Herramienta que verifica el código en busca de violaciones de formato y estilo sin ejecutarlo.
- **Coverage:** Porcentaje de líneas de código productivo ejecutadas por los tests automatizados.
- **Quality Gate:** Conjunto de condiciones en SonarCloud que deben cumplirse todas para que el análisis se considere exitoso.
- **Ambiente Preview:** Una instancia en ejecución de la aplicación desplegada desde una feature branch, usada para QA manual.
- **Pipeline de calidad:** La secuencia completa de pasos de CI (linters + tests + coverage + SonarCloud) que corre en cada pull request (bloqueando el merge) y en cada push a `main` (bloqueando el despliegue a producción).

---

### 5) Requerimientos Funcionales (RF)

#### 5.1 Linter en pull requests

- **RF-01:** El sistema DEBE correr PHP Pint en modo check (`--test`) en cada evento `pull_request` y en cada `push` a `main` cuando hayan cambiado archivos en `code/api/**`.
- **RF-02:** El sistema DEBE correr ESLint y el type-check de TypeScript en cada evento `pull_request` y en cada `push` a `main` cuando hayan cambiado archivos en `code/webapp/**`.
- **RF-03:** Un pull request NO DEBE ser fusionable si cualquier check automatizado (linter, tests o quality gate de SonarCloud) para el subproyecto afectado no ha completado exitosamente.

#### 5.2 Tests y coverage en pull requests y main

- **RF-04:** El sistema DEBE correr PHPUnit con reporte de coverage en cada evento `pull_request` y en cada `push` a `main` cuando hayan cambiado archivos en `code/api/**`. El coverage DEBE exportarse como `coverage.xml` (formato Clover) para consumo de SonarCloud.
- **RF-05:** El sistema DEBE correr Vitest con reporte de coverage en cada evento `pull_request` y en cada `push` a `main` cuando hayan cambiado archivos en `code/webapp/**`. El coverage DEBE exportarse en formato lcov para consumo de SonarCloud.
- **RF-06:** Un pull request NO DEBE ser fusionable si algún paso de tests ha fallado. El despliegue a producción NO DEBE proceder si algún paso de tests en `main` ha fallado.

#### 5.3 Quality gate de SonarCloud en pull requests y main

- **RF-07:** Ambos reportes de coverage (PHP y JS) DEBEN subirse a SonarCloud en cada evento `pull_request` y en cada `push` a `main`.
- **RF-08:** El resultado del quality gate de SonarCloud DEBE evaluarse en cada pull request (bloqueando el merge en caso de fallo) y antes de que corra el paso de despliegue a producción en `main` (bloqueando el deploy en caso de fallo).

#### 5.4 Protección de rama

- **RF-09:** La rama `main` DEBE requerir un pull request con al menos una revisión humana aprobada antes del merge.
- **RF-10:** La rama `main` DEBE requerir que los cinco status checks pasen antes de que un pull request pueda fusionarse: `api-lint`, `webapp-lint`, `api-tests`, `webapp-tests` y `sonarcloud`.
- **RF-11:** Las revisiones aprobadas DEBEN invalidarse cuando se hagan nuevos commits a la rama del pull request.
- **RF-12:** Las ramas de pull request DEBEN estar actualizadas con `main` antes de fusionarse.

---

### 6) Reglas de Negocio (RN)

#### 6.1 Scope de triggers — solo rutas modificadas

- **RN-01:** Los workflows de linter y tests DEBEN usar filtros de ruta (`paths:`) para que un cambio en `code/api/**` no detone el pipeline de webapp, y viceversa. Esto previene ejecuciones innecesarias del pipeline y reduce los minutos de CI consumidos.
- **RN-02:** Un PR que solo modifique `doc/**` o archivos en la raíz NO DEBE detonar ningún workflow de linter o tests. Los cambios solo de infraestructura siguen la misma regla.

#### 6.2 Umbrales de coverage

- **RN-03:** El quality gate de SonarCloud DEBE enforcar un coverage mínimo general de **70%** para los proyectos PHP y JS. Este umbral puede subir conforme el codebase madure; NO DEBE bajarse sin una decisión documentada.
- **RN-04:** El código nuevo introducido en un pull request DEBE mantener al menos el mismo porcentaje de coverage que el proyecto general al momento del merge. El gate de "nuevo código" de SonarCloud lo enforza automáticamente.

#### 6.3 Cero nuevos issues bloqueantes

- **RN-05:** El quality gate de SonarCloud DEBE fallar si el análisis introduce **cualquier nuevo issue bloqueante o crítico** (hotspot de seguridad, bug mayor o vulnerabilidad crítica). Los issues existentes heredados de commits anteriores se rastrean por separado y se resuelven en tasks dedicados; NO DEBEN bloquear nuevas features.

#### 6.4 Revisores requeridos

- **RN-06:** Todo pull request que apunte a `main` DEBE ser revisado por al menos **Dervi** o el desarrollador líder antes de que se autorice el merge. La revisión de Copilot es aditiva — no satisface el requerimiento de revisor humano.
- **RN-07:** El desarrollador que abre el pull request NO DEBE auto-aprobarlo como único aprobador. Siempre se requiere una segunda perspectiva.

#### 6.5 Preview antes del merge

- **RN-08:** Antes de autorizar un merge a `main`, la feature branch DEBE desplegarse en `preview.sushigo-romita.com` y verificarse manualmente. Esta es una **regla de proceso** — no la enforza GitHub Actions, pero es un compromiso del equipo. Los pull requests que omitan el paso de preview se consideran incompletos.
- **RN-09:** Si el despliegue en preview revela un defecto, el pull request DEBE actualizarse y volver a desplegarse en preview antes de que se autorice el merge. La aprobación se invalida con nuevos commits (ver RF-11).

---

### 7) Definiciones Cerradas (DC)

- **DC-01 (Linter pasado):** Un paso de linter se considera "pasado" cuando `pint --test` termina con código 0 (sin violaciones de formato) y ESLint termina con código 0 (sin errores de lint, sin errores de tipos de TypeScript). Las advertencias no fallan el paso de lint; los errores sí.

- **DC-02 (Quality gate pasado):** Un análisis de SonarCloud se considera "pasado" cuando todas las condiciones del quality gate configurado se cumplen: coverage general ≥ 70%, nuevo coverage ≥ coverage del proyecto, cero nuevos issues bloqueantes/críticos. Un estado "warning" en SonarCloud se trata como "pasado" y no bloquea el despliegue.

- **DC-03 (Despliegue a producción):** Un despliegue a producción se define como: construir imagen Docker productiva → pushear a Google Artifact Registry → desplegar una nueva revisión en Google Cloud Run → actualizar el esquema de la base de datos de producción en Supabase (migraciones). Esta secuencia es atómica desde la perspectiva del pipeline — si cualquier paso falla, la revisión anterior permanece activa.

- **DC-04 (Despliegue a preview):** Un despliegue a preview usa el mismo proceso de build que producción pero apunta a un servicio de Cloud Run separado y una base de datos Supabase separada. El estado del preview es efímero — no se garantiza que sea consistente entre despliegues y no se usa para datos que fluyan a producción.

- **DC-05 (Rama main):** `main` es la única fuente de verdad para producción. Siempre está en estado desplegable. No se permiten commits directos. Cada cambio llega mediante un pull request revisado que ha pasado los cinco checks automatizados: linters, tests y quality gate de SonarCloud.
