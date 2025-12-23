# Nginx Reverse Proxy Configuration

Esta configuración implementa nginx como reverse proxy centralizado para los entornos de desarrollo y E2E de SushiGo.

## Arquitectura

```
                                    ┌─────────────────┐
                                    │  nginx:alpine   │
                                    │  (Reverse Proxy)│
                                    │   Port 80/443   │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    │                                                  │
         ┌──────────▼──────────┐                          ┌───────────▼────────────┐
         │  sushigo.local      │                          │  sushigo.e2e.local     │
         │  (Dev Environment)  │                          │  (E2E Environment)     │
         │  dev:80 / dev:443   │                          │  test_e2e:80 / 443     │
         └─────────────────────┘                          └────────────────────────┘
                  │                                                   │
         ┌────────▼────────┐                              ┌──────────▼──────────┐
         │ Apache + Laravel│                              │ Apache + Laravel    │
         │ Vite Dev Server │                              │ Vite Dev Server     │
         │ (Port 5173)     │                              │ (Port 5173)         │
         └─────────────────┘                              └─────────────────────┘
```

## Características

### 🔒 SSL/TLS
- Certificados compartidos entre ambos entornos
- Redirección automática HTTP → HTTPS
- TLS 1.2 y 1.3

### 🔄 Reverse Proxy
- **sushigo.local** → dev:80/443 (API Laravel + Vite)
- **sushigo.e2e.local** → test_e2e:80/443 (Entorno E2E)

### 🛡️ Seguridad
- Headers de seguridad (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- CORS configurado para desarrollo
- SSL verification deshabilitado para desarrollo local

### 📡 WebSocket Support
- Soporte completo para Vite HMR (Hot Module Replacement)
- Headers Upgrade y Connection configurados

### 🔄 Fallback E2E
Si el contenedor E2E no está disponible, nginx muestra una página HTML con:
- Explicación del error
- Comandos para levantar el entorno E2E
- Instrucciones de uso

## Archivos de Configuración

```
docker/nginx/
├── nginx.conf                  # Configuración principal de nginx
└── conf.d/
    └── sushigo.conf           # Virtual hosts para sushigo.local y sushigo.e2e.local
```

## Configuración de Apache Simplificada

El Apache en los contenedores dev y e2e ahora usa una configuración simplificada (`apache-simple.conf`) que:
- Sirve directamente la API Laravel
- No incluye reverse proxy (eso lo hace nginx)
- Mantiene soporte SSL para la comunicación interna
- Configuración CORS para desarrollo

## Uso

### Levantar Entorno de Desarrollo

```bash
# Levantar servicios principales (incluye nginx)
docker-compose up -d

# Acceder a la aplicación
open https://sushigo.local
```

### Levantar Entorno E2E

```bash
# Levantar entorno E2E (por defecto usa https://sushigo.e2e.local)
docker-compose -f docker-compose.e2e.yml up -d

# Acceder al entorno E2E
open https://sushigo.e2e.local

# Ejecutar pruebas con URL personalizada
CYPRESS_baseUrl=https://sushigo.local docker-compose -f docker-compose.e2e.yml run cypress

# Ejecutar pruebas (usa la URL configurada en docker-compose.e2e.yml)
docker-compose -f docker-compose.e2e.yml run cypress

# Ver pruebas en interfaz gráfica
open http://localhost:6080
```

#### Configurar Base URL de E2E

El baseUrl de Cypress puede configurarse de varias formas (en orden de precedencia):

1. **Variable de entorno al ejecutar comando:**
   ```bash
   CYPRESS_baseUrl=https://sushigo.e2e.local docker-compose -f docker-compose.e2e.yml run cypress
   ```

2. **Archivo `.env` en la raíz del proyecto:**
   ```env
   # .env
   CYPRESS_baseUrl=https://sushigo.e2e.local
   ```
   Luego Docker Compose lo tomará automáticamente.

3. **Valor por defecto en docker-compose.yml/docker-compose.e2e.yml:**
   - `dev` container: `https://sushigo.local`
   - `test_e2e` container: `https://sushigo.e2e.local`
   - `cypress` container: `https://sushigo.e2e.local`

4. **Valor por defecto en cypress.config.ts:**
   ```typescript
   baseUrl: 'https://sushigo.local'
   ```

**Ejemplo de archivo .env en la raíz del proyecto:**
```bash
# .env
CYPRESS_baseUrl=https://sushigo.e2e.local
VITE_PORT=5173
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
```

### Detener Entorno E2E

```bash
docker-compose -f docker-compose.e2e.yml down
```

## Puertos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| nginx | 80 | HTTP (redirige a HTTPS) |
| nginx | 443 | HTTPS |
| dev | 5173 | Vite dev server (expuesto) |
| dev | 80/443 | Apache interno (solo nginx) |
| test_e2e | 80/443 | Apache interno (solo nginx) |
| pgsql | 5432 | PostgreSQL |
| pgadmin | 5050 | pgAdmin interface |
| mailhog | 8025 | MailHog web UI |
| cypress-ui | 6080 | VNC web interface |

## Logs

```bash
# Ver logs de nginx
docker logs -f nginx_proxy

# Ver logs de dev
docker logs -f dev_container

# Ver logs de e2e
docker logs -f e2e_container
```

## Troubleshooting

### El sitio no carga en sushigo.local

1. Verifica que nginx esté corriendo:
   ```bash
   docker ps | grep nginx_proxy
   ```

2. Verifica que dev esté healthy:
   ```bash
   docker ps | grep dev_container
   ```

3. Revisa los logs de nginx:
   ```bash
   docker logs nginx_proxy
   ```

### Error 502 en sushigo.e2e.local

Esto es normal si el entorno E2E no está levantado. Verás una página con instrucciones para levantarlo.

Para levantarlo:
```bash
docker-compose -f docker-compose.e2e.yml up -d
```

### Problemas con certificados SSL

Si tienes problemas con certificados, verifica que existan en:
```bash
ls -la docker/app/config/dev/cert/
```

Deberías ver:
- `sushigo.local.crt`
- `sushigo.local-key.pem`
- `rootCA.pem`

## Ventajas de esta Arquitectura

1. **Separación de Responsabilidades**: nginx maneja el routing y SSL, Apache sirve la aplicación
2. **Fallback Elegante**: Página informativa cuando E2E no está disponible
3. **Simplicidad**: Apache solo sirve la aplicación, sin configuración de reverse proxy
4. **Flexibilidad**: Fácil agregar más dominios o servicios
5. **Desarrollo/Producción Similar**: nginx es común en producción
