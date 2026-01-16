# 🚀 Task #012: Production Deployment Infrastructure

## 📖 Story

### 🇬🇧 English

As a DevOps engineer, I need to set up production deployment configuration for both backend API and frontend application with proper environment variable management, Docker containerization, and external database support, so that the system can be deployed to production environments securely and reliably with minimal manual configuration.

### 🇪🇸 Español

Como ingeniero DevOps, necesito configurar el despliegue de producción tanto para el API backend como para la aplicación frontend con gestión adecuada de variables de entorno, contenedorización Docker y soporte para bases de datos externas, para que el sistema pueda desplegarse en entornos de producción de manera segura y confiable con mínima configuración manual.

---

## ✅ Technical Tasks

### Backend API Production Setup

-   [x] 🐳 Create multi-stage Dockerfile for production build
    -   Split base, dev, and prod stages
    -   Configure Apache to serve from `/public` directory
    -   Set up proper build args for Laravel configuration
    -   Move cache generation to runtime for dynamic environment variables
-   [x] 📝 Create production initialization script (`init.sh`)
    -   Add database connection health check with retry logic
    -   Clear and regenerate Laravel cache with runtime environment variables
    -   Execute database migrations and seeders
    -   Start Apache server
-   [x] 🔧 Configure production environment variables
    -   Remove hardcoded ENV from Dockerfile for database credentials
    -   Set up runtime environment variable injection via docker-compose
    -   Support external database connections (e.g., Supabase)
-   [x] 👥 Implement production user seeding
    -   Create UserSeeder for production with default admin account
    -   Add intelligent check to skip seeding if admins already exist
    -   Configure correct guard (`api`) for Spatie Permission
    -   Add security warnings about changing default passwords

### Frontend Production Setup

-   [x] 🐳 Create multi-stage Dockerfile for frontend
    -   Stage 1: Node build with Vite
    -   Stage 2: Nginx serving static files
    -   Pass API URL as build argument
    -   Generate `.env` file dynamically during build
-   [x] 🌐 Configure Nginx for SPA
    -   Set up fallback routing for single-page application
    -   Configure aggressive caching for versioned assets
-   [x] 🔧 Pass API URL configuration
    -   Accept VITE_API_URL as build argument
    -   Create .env file during build process
    -   Ensure Vite reads configuration correctly

### Docker Compose Production

-   [x] 📦 Create `docker-compose.prod.yml`
    -   Configure `api-prod` service with environment variables
    -   Configure `front-prod` service with build arguments
    -   Set up proper volume mounting for init script
    -   Map services to appropriate ports (8090 for API, 8005 for frontend)

### Environment Configuration

-   [x] 🔐 Update `.env.example` with production variables
    -   Add `POSTGRES_PROD_*` variables for external database
    -   Add `API_APP_PORT` and `VITE_APP_PORT`
    -   Add `PGADMIN_PORT` and `MAILHOG_PORT`
    -   Document why local dev credentials are safe to include
    -   Organize sections with clear headers
-   [x] 📄 Create root `.env` with production database credentials
    -   Add `POSTGRES_PROD_PASS` variable

### API Enhancements

-   [x] 🏥 Enhance health check endpoint
    -   Add database connection verification
    -   Return detailed status with timestamp
    -   Return 503 status code on failure
    -   Include database connection status in response

### Code Quality & Bug Fixes

-   [x] 🐛 Fix TypeScript compilation errors in frontend
    -   Remove unused imports and variables
    -   Fix type definitions for OperatingUnit
    -   Correct AdjustmentType enum usage
    -   Remove unused `branches` prop from components
    -   Delete unregistered route file (`open-session.tsx`)
-   [x] 🔧 Fix Laravel configuration
    -   Add `schema` property to PostgreSQL config
    -   Add `guard_name = 'api'` to User model
    -   Update CORS allowed origins for production port
-   [x] 📝 Update `.dockerignore`
    -   Add exclusions for API and webapp build artifacts

### Database Setup

-   [x] 💾 Create production database in PostgreSQL init script
    -   Add `sushigo_prod` database creation
    -   Grant privileges to admin user

---

## ⏱️ Time

### 📊 Estimates

-   **Optimistic:** `4h`
-   **Pessimistic:** `12h`
-   **Tracked:** `8h 30m`

### 📅 Sessions

```json
[
    { "date": "2026-01-10", "start": "14:00", "end": "18:30" },
    { "date": "2026-01-15", "start": "19:00", "end": "23:00" }
]
```

---

## 📝 Notes

### Key Architectural Decisions:
1. **Dynamic Environment Variables**: Moving Laravel cache generation to runtime (`init.sh`) allows for dynamic database credentials, essential for external database services like Supabase.

2. **Multi-Stage Docker Builds**: Separating build and runtime stages reduces final image size and improves security by excluding build tools from production images.

3. **Smart User Seeding**: Production seeder checks for existing admin users before creating defaults, preventing duplicate accounts on subsequent deployments.

4. **Build-Time Frontend Config**: Frontend API URL is injected at build time via `.env` file generation, allowing Vite to compile the correct API endpoint into the static bundle.

### Security Considerations:
- Default admin credentials must be changed immediately after first deployment
- Production database credentials stored in `.env` (gitignored)
- Local dev credentials are safe to commit as they're for ephemeral Docker containers

### Dependencies:
- PostgreSQL 15
- PHP 8.2 with Apache
- Node.js 20 (Alpine)
- Nginx 1.27 (Alpine)
- Laravel 11.x
- Vite 5.x
