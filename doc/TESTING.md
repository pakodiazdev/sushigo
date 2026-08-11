# 🧪 Testing Setup - SushiGo API

## Configuración de Testing con PostgreSQL

El proyecto está configurado para usar **PostgreSQL** tanto en desarrollo como en testing, manteniendo consistencia entre ambos entornos.

### 📋 Requisitos Previos

-   Docker y Docker Compose instalados
-   Clonar el repositorio

### 🚀 Setup Rápido

```bash
# 1. Copiar variables de entorno
cp code/api/.env.example code/api/.env

# 2. Generar key de Laravel
cd code/api
php artisan key:generate

# 3. Levantar servicios (desde la raíz del proyecto)
cd ../..
docker compose up -d

# 4. Crear base de datos de testing (una sola vez)
docker exec -it dev_container psql -h pgsql -U admin -d mydb -c "CREATE DATABASE mydb_test;"

# 5. Ejecutar migraciones
docker exec -it dev_container php artisan migrate --seed

# 6. Ejecutar pruebas
docker exec -it dev_container php artisan test
```

### 🗄️ Bases de Datos

El proyecto utiliza dos bases de datos PostgreSQL:

-   **`mydb`**: Base de datos de desarrollo
-   **`mydb_test`**: Base de datos de testing (aislada, se limpia en cada test)

Ambas corren en el mismo contenedor PostgreSQL (`pgsql`).

### ⚙️ Configuración

#### phpunit.xml

```xml
<env name="DB_CONNECTION" value="pgsql"/>
<env name="DB_HOST" value="pgsql"/>
<env name="DB_PORT" value="5432"/>
<!-- DB_DATABASE is intentionally NOT set here — it must be supplied by the environment
     running the tests (e.g. DB_DATABASE=mydb_test), otherwise tests silently fall back
     to the dev database (mydb). See "Ejecutar Tests" below. -->
<env name="DB_USERNAME" value="admin"/>
<env name="DB_PASSWORD" value="admin"/>
```

#### .env.example

```bash
DB_CONNECTION=pgsql
DB_HOST=pgsql
DB_PORT=5432
DB_DATABASE=mydb
DB_USERNAME=admin
DB_PASSWORD=admin
```

### 🧪 Ejecutar Tests

**Local (pre-PR): solo linters + los tests que entregaste.** No corras la suite completa como paso
local — es responsabilidad de CI, que ya la corre con su propia base de datos aislada en cada PR;
correrla también en local es trabajo duplicado. Los comandos abajo pasan `DB_DATABASE=mydb_test`
explícitamente porque `phpunit.xml` no la fija por defecto (ver arriba) — sin ese valor, `php
artisan test` usaría la base de datos de desarrollo (`mydb`). Si trabajas en dev-lab, ver
`doc/conventions/testing/testing-strategy.md` → "Local vs CI" para el equivalente con la base de
datos aislada por workspace, que `code/api/.env.testing` ya provee automáticamente.

```bash
# Test específico (uso local recomendado antes de abrir un PR)
docker exec -it dev_container bash -c "cd /app/code/api && DB_DATABASE=mydb_test php artisan test --filter=OpeningBalanceTest"

# Suite específica
docker exec -it dev_container bash -c "cd /app/code/api && DB_DATABASE=mydb_test php artisan test --testsuite=Feature"
```

Suite completa — opcional localmente, solo para paridad con CI (por ejemplo, para reproducir un
fallo reportado por CI):

```bash
# Todas las pruebas
docker exec -it dev_container bash -c "cd /app/code/api && DB_DATABASE=mydb_test php artisan test"

# Con cobertura
docker exec -it dev_container bash -c "cd /app/code/api && DB_DATABASE=mydb_test php artisan test --coverage"
```

### 👤 Usuarios de Testing

El proyecto incluye 3 usuarios pre-configurados con diferentes roles y asignaciones a unidades operativas:

| Usuario               | Email                    | Password          | Role              | Operating Units           |
| --------------------- | ------------------------ | ----------------- | ----------------- | ------------------------- |
| **Super Admin**       | `superadmin@sushigo.com` | `admin123456`     | super-admin       | Todas (OWNER)             |
| **Admin**             | `admin@sushigo.com`      | `admin123456`     | admin             | Todas (MANAGER)           |
| **Inventory Manager** | `inventory@sushigo.com`  | `inventory123456` | inventory-manager | Main + Buffer (INVENTORY) |

**Unidades Operativas creadas por defecto:**

-   **Inventario Principal** (BRANCH_MAIN)
-   **Área de Recepción** (BRANCH_BUFFER)
-   **Devoluciones** (BRANCH_RETURN)

**Nota**: Estos usuarios se crean automáticamente al ejecutar `php artisan migrate:fresh --seed`

### 📊 Suite de Tests Implementada

#### ✅ OpeningBalanceTest (11 pruebas)

-   ✅ Registrar saldo inicial con unidad base
-   ✅ Registrar saldo inicial con conversión de unidades
-   ✅ Calcular costo promedio ponderado
-   ✅ Validar autenticación
-   ✅ Validar campos requeridos
-   ✅ Validar cantidad positiva
-   ✅ Validar existencia de location
-   ✅ Validar existencia de item variant
-   ✅ Validar existencia de UOM
-   ✅ Fallar cuando no hay conversión disponible
-   ✅ Almacenar metadata correctamente

#### 🔄 ItemCrudTest (11 pruebas)

-   Listar items
-   Filtrar por tipo
-   Buscar por nombre/SKU
-   Crear item
-   Auto-mayúsculas en SKU/type
-   Validar SKU único
-   Validar tipo de item
-   Mostrar item
-   Actualizar item
-   Eliminar item sin variantes
-   No eliminar item con variantes

#### 🔄 ItemVariantCrudTest (11 pruebas)

-   Listar variantes
-   Filtrar por item
-   Crear variante
-   Validar código único
-   Validar min/max stock
-   Mostrar variante con totales de stock
-   Actualizar variante
-   Eliminar variante sin stock
-   No eliminar variante con stock
-   Filtrar variantes activas
-   Auto-mayúsculas en código

### 🔧 Troubleshooting

#### Error: "database mydb_test does not exist"

```bash
docker exec -it dev_container psql -h pgsql -U admin -d mydb -c "CREATE DATABASE mydb_test;"
```

#### Limpiar base de datos de testing

```bash
docker exec -it dev_container psql -h pgsql -U admin -d mydb -c "DROP DATABASE IF EXISTS mydb_test; CREATE DATABASE mydb_test;"
```

#### Verificar conexión a PostgreSQL

```bash
docker exec -it dev_container psql -h pgsql -U admin -d mydb -c "\l"
```

### 🎯 Ventajas de PostgreSQL en Testing

1. **Consistencia**: Mismo motor de BD en dev y testing
2. **ILIKE Support**: Búsquedas case-insensitive nativas
3. **Constraints**: Validación de CHECK constraints y ENUM
4. **Computed Columns**: Soporte para generated columns
5. **JSON**: Operaciones nativas con campos JSON/JSONB
6. **Transacciones**: RefreshDatabase funciona correctamente

### 📝 Notas

-   Cada test se ejecuta en una transacción que se revierte al finalizar (RefreshDatabase)
-   Los seeders se ejecutan automáticamente en el setup de cada test
-   La base de datos `mydb_test` permanece limpia entre ejecuciones
-   Los tests usan Passport para autenticación simulada

### 🔗 Recursos

-   [Laravel Testing](https://laravel.com/docs/testing)
-   [PHPUnit](https://phpunit.de/)
-   [PostgreSQL 15](https://www.postgresql.org/docs/15/)
-   [Laravel Passport](https://laravel.com/docs/passport)
