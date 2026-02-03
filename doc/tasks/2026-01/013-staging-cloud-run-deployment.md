# ☁️ Task #013: Preview Deployment on Google Cloud Run

## 📖 Story

### 🇪🇸 Español
Como ingeniero DevOps, necesito crear un proceso de despliegue en Google Cloud Run que genere una imagen capaz de servir el API Laravel y el frontend React desde un único contenedor, para ofrecer un entorno de preview/staging consistente y fácilmente reproducible.

### 🇬🇧 English
As a DevOps engineer, I need to build a Google Cloud Run deployment that produces one container image servicing both the Laravel API and the React frontend, so that we can run a consistent and easily reproducible preview/staging environment.

---

## ✅ Technical Tasks
- [X] 🐳 **Multi-stage Dockerfile**: Extended existing Dockerfile with `preview` target that compiles React (node:20) and packages with Laravel in Apache + PHP-8.2 image, maintaining base/dev/prod/preview structure.
- [X] 🔗 **Unified Routing**: Configured Apache to serve Laravel API (`/api/*`) and React frontend (`/`) from a single container with specific rewrite rules and SPA fallback.
- [X] 🛣️ **API URL Structure**: Implemented URL routing with structure `/api/v1/*`, `/api/auth/*`, `/api/up`, `/api/documentation` for Laravel and SPA routes for React with assets at `/assets/*`.
- [X] 🔐 **Auth Routes**: Configured authentication routes in two structures: `/api/auth/*` (direct) and `/api/v1/auth/*` (versioned) for maximum compatibility.
- [X] 🧪 **Local Testing**: Validated preview functionality with docker-compose, including health checks (`/api/up`, `/api/v1/health`) and authentication.
- [X] ⚙️ **Configuration Management**: Configured `APP_URL=http://localhost:8091` for Swagger UI, environment variables in docker-compose.preview.yml, and OAuth keys mounted as volumes.
- [X] 📂 **Build Arguments**: Reorganized build arguments to support `preview/staging` profiles with specific variables (APP_ENV=preview, VITE_API_URL, DB_CONNECTION, etc.).
- [X] 🔐 **Preview Secrets**: Defined preview/staging variables and secrets (Cloud Secret Manager) including database credentials, JWT secrets and OAuth.
- [X] 🚀 **CI/CD Pipeline**: Configured optimized build/push pipeline with resilient cache (GitHub Actions) to Artifact Registry with `preview-*` tagging using preview target.
- [X] ☁️ **Cloud Run Service**: Provisioned Cloud Run service (region `us-central1`, port 8080, auto-scaling) deployed at `https://preview.sushigo-romita.com`.
- [X] 🌐 **Domain & HTTPS**: Configured custom domain and HTTPS (Cloud Run domain mapping) to expose frontend and API under the same hostname with security headers.
- [X] 📊 **Documentation**: Documented deployment steps, cache optimization, and troubleshooting in workflows with functional final URL structure.

---

## 🏗️ Completed Implementation

### ✅ Multi-stage Dockerfile (Target `preview`)
```dockerfile
FROM preview AS staging
# Copy Apache configuration specific for preview
COPY ./docker/app/config/preview/000-default.conf /etc/apache2/sites-available/000-default.conf
# Copy compiled frontend from node_builder
COPY --from=node_builder /webapp/dist /var/www/html/webapp
```

### ✅ Unified Apache Configuration
```apache
# Laravel API routes
RewriteRule ^/api/(.*)$ /var/www/html/api/public/index.php [L,QSA]

# Swagger Documentation
RewriteRule ^/docs/?$ /var/www/html/api/public/index.php [L,QSA]
RewriteRule ^/docs/(.*)$ /var/www/html/api/public/index.php [L,QSA]

# React SPA fallback (only in webapp directory)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

### ✅ Implemented URL Structure
- **Laravel API**: `/api/v1/*`, `/api/auth/*`, `/api/up`, `/api/documentation`
- **Swagger UI**: `/api/documentation` (HTML interface)
- **OpenAPI JSON**: `/docs`, `/docs?api-docs.json`
- **React SPA**: `/`, `/login`, application routes
- **Assets**: `/assets/*` (Vite static files)

### ✅ Preview Environment Variables
```yaml
environment:
  - APP_URL=http://localhost:8091  # Crucial for Swagger UI
  - DB_HOST=pgsql
  - DB_PORT=5432
```

### ✅ Functional Validation
- ✅ Health checks: `/api/up`, `/api/v1/health`
- ✅ Authentication: `/api/auth/login`, `/api/v1/auth/login`
- ✅ Documentation: Functional Swagger UI with OpenAPI JSON
- ✅ Frontend: React SPA with routing and assets
- ✅ CORS: Headers configured for development

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `6h`
- **Pessimistic:** `14h`
- **Tracked:** `0h`

### 📅 Sessions
```json
[]
```

---

## 📝 Notes
- **Implemented architecture**: Apache + PHP-8.2 instead of Nginx + PHP-FPM/Supervisor, leveraging existing base configuration and mod_rewrite for unified routing.
- **Final URL structure**: Laravel API under `/api/*` (health: `/api/up`, versioned: `/api/v1/*`, auth: `/api/auth/*`, docs: `/api/documentation`) and React SPA at `/` with fallback routing.
- **Optimized multi-stage**: Frontend build (node:20-alpine) → Apache+PHP runtime, with static assets served directly by Apache from `/var/www/html/webapp`.
- **Preview target**: Specific target for Cloud Run with Apache (port 80), preview environment variables (APP_URL=http://localhost:8091), OAuth keys, and Swagger UI documentation configuration.
- **Auth compatibility**: Dual authentication structure for frontend flexibility (`/api/auth/login` direct and `/api/v1/auth/login` versioned).
- **Target size**: Maintain final image <1.5GB by eliminating build artifacts (node_modules, build tools) from final runtime.
