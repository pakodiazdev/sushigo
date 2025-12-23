# Cypress E2E Testing con VNC/noVNC

Esta configuración te permite ejecutar tests de Cypress con interfaz gráfica a través del navegador.

## 🚀 Servicios Disponibles

### 1. `cypress` - Modo Headless (CI/CD)
Ejecuta los tests sin interfaz gráfica, ideal para pipelines automatizados.

```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml run --rm cypress
```

### 2. `cypress-ui` - Modo Interactivo con VNC
Ejecuta Cypress con interfaz gráfica accesible desde el navegador.

```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up cypress-ui
```

Luego abre en tu navegador: **http://localhost:6080**

## 📋 Configuración

### Estructura de archivos
```
code/webapp/
├── cypress.config.ts          # Configuración de Cypress
├── cypress/
│   ├── e2e/                   # Tests E2E
│   │   └── home.cy.ts         # Test de ejemplo
│   ├── support/
│   │   ├── commands.ts        # Comandos personalizados
│   │   └── e2e.ts             # Setup global
│   └── tsconfig.json          # Config TypeScript para Cypress
└── package.json               # Dependencias (incluye Cypress)
```

### Variables de entorno

En `docker-compose.e2e.yml` puedes ajustar:
- `CYPRESS_baseUrl`: URL base de tu aplicación (default: `http://dev:80`)
- `DISPLAY`: Display de X11 (default: `:99`)

## 🎯 Uso

### Ejecutar tests en modo headless
```bash
# Todos los tests
docker compose -f docker-compose.yml -f docker-compose.e2e.yml run --rm cypress

# Tests específicos
docker compose -f docker-compose.yml -f docker-compose.e2e.yml run --rm cypress \
  sh -c "cd /app/code/webapp && npm install && npx cypress run --spec 'cypress/e2e/home.cy.ts'"
```

### Ejecutar tests con interfaz gráfica (noVNC)
```bash
# Iniciar el servicio
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up cypress-ui

# En otra terminal o abre en el navegador:
# http://localhost:6080
```

### Cliente VNC nativo (opcional)
Si prefieres usar un cliente VNC nativo en lugar del navegador:
```bash
# Conecta a: localhost:5900
# Sin contraseña
```

## 🛠️ Comandos útiles

### Reconstruir la imagen personalizada
```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml build cypress-ui
```

### Ver logs del servicio UI
```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml logs -f cypress-ui
```

### Detener servicios
```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml down
```

### Limpiar volúmenes de caché
```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml down -v
```

## 📝 Crear nuevos tests

1. Crea un archivo en `code/webapp/cypress/e2e/`:
```typescript
describe('Mi Test', () => {
  it('debe funcionar', () => {
    cy.visit('/')
    cy.contains('Texto esperado').should('be.visible')
  })
})
```

2. Ejecuta el test:
```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml run --rm cypress
```

## 🐛 Troubleshooting

### Error: "Could not find a Cypress configuration file"
- Verifica que `cypress.config.ts` existe en `/app/code/webapp/`
- Verifica que el `working_dir` en docker-compose apunta correctamente

### Error: "Cannot find package 'cypress'"
- Asegúrate de que `npm install` se ejecute antes de Cypress
- Verifica que `package.json` incluye cypress en devDependencies

### La interfaz VNC no se muestra
- Espera unos segundos para que los servicios inicien
- Verifica que el puerto 6080 esté disponible: `lsof -i :6080`
- Revisa los logs: `docker compose logs cypress-ui`

### Tests fallan por timeout
- Aumenta el baseUrl timeout en `cypress.config.ts`
- Verifica que el servicio `dev` esté corriendo correctamente
- Asegúrate de que la red Docker permite comunicación entre servicios

## 📦 Imagen personalizada

La imagen `cypress-ui` está basada en Node.js 20 e incluye:
- ✅ Node.js 20 (Bookworm/Debian)
- ✅ Google Chrome estable
- ✅ Xvfb (servidor X virtual)
- ✅ x11vnc (servidor VNC)
- ✅ noVNC (cliente web)
- ✅ Fluxbox (gestor de ventanas)
- ✅ Cypress 13.6.0

El Dockerfile está en: `docker/e2e-ui/Dockerfile`
