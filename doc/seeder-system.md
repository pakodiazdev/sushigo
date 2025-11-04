# Database Seeders with Tracking & Locking

Sistema avanzado de seeders organizados por entorno con seguimiento y bloqueo automático, similar a kuantys-api.

## 📁 Estructura

```
database/seeders/
├── DatabaseSeeder.php              # Seeder principal que detecta el entorno
├── Base/                           # Clases base para seeders
│   ├── LockedSeeder.php           # Base para seeders que se bloquean
│   ├── OnceSeeder.php             # Base para seeders que corren una vez
│   └── RepeatableSeeder.php       # Base para seeders repetibles
├── Traits/
│   └── TrackableSeeder.php        # Trait para tracking y locking
├── Development/                    # Seeders para desarrollo/local/testing
│   ├── DevelopmentSeeder.php      # Orquestador de seeders de desarrollo
│   ├── UserSeeder.php             # Usuarios de prueba (OnceSeeder)
│   ├── RoleSeeder.php             # Roles de desarrollo (LockedSeeder)
│   ├── PermissionSeeder.php       # Permisos de desarrollo (LockedSeeder)
│   └── UserRoleSeeder.php         # Asignación de roles (OnceSeeder)
└── Production/                     # Seeders para producción
    ├── ProductionSeeder.php       # Orquestador de seeders de producción
    ├── RoleSeeder.php             # Roles esenciales (LockedSeeder)
    └── PermissionSeeder.php       # Permisos de producción (LockedSeeder)
```

## 📊 Comparación de Clases Base

| Clase Base | Se Ejecuta | Se Bloquea | Uso Recomendado |
|------------|-----------|-----------|-----------------|
| `LockedSeeder` | Una vez | ✅ Sí | Roles, Permisos, Config crítica |
| `OnceSeeder` | Una vez | ❌ No | Usuarios, Datos iniciales |
| `RepeatableSeeder` | Siempre | ❌ No | Datos dinámicos, Actualizaciones |

### Ejemplos de Uso

```php
// 🔒 LOCKED - Para datos críticos del sistema
class RoleSeeder extends LockedSeeder { }          // Se ejecuta 1 vez, se BLOQUEA
class PermissionSeeder extends LockedSeeder { }    // Se ejecuta 1 vez, se BLOQUEA

// ✓ ONCE - Para datos iniciales
class UserSeeder extends OnceSeeder { }            // Se ejecuta 1 vez, NO se bloquea
class CategorySeeder extends OnceSeeder { }        // Se ejecuta 1 vez, NO se bloquea

// 🔄 REPEATABLE - Para datos actualizables
class StockSeeder extends RepeatableSeeder { }     // Se ejecuta SIEMPRE
class CacheSeeder extends RepeatableSeeder { }     // Se ejecuta SIEMPRE
```

## 🔐 Sistema de Bloqueo

### ¿Por qué bloquear seeders?

En desarrollo, algunos seeders como **Roles** y **Permisos** solo deben ejecutarse una vez. Si se ejecutan múltiples veces:
- Se duplicarían permisos
- Se sobrescribirían configuraciones
- Se generarían inconsistencias

El sistema de bloqueo previene automáticamente la re-ejecución de seeders críticos.

### Tipos de Seeders

#### 🔒 Seeders Bloqueados (`lockAfterExecution = true`)
Se ejecutan UNA vez y se bloquean automáticamente:
- `RoleSeeder` (Development/Production)
- `PermissionSeeder` (Development/Production)

#### ✅ Seeders No Bloqueados (`lockAfterExecution = false`)
Se pueden ejecutar múltiples veces (con `runOnce = true` se saltan si ya se ejecutaron):
- `UserSeeder`
- `UserRoleSeeder`

### Tabla de Tracking

Los seeders se registran en la tabla `seeder_logs`:

| Campo | Descripción |
|-------|-------------|
| seeder_class | Nombre completo de la clase del seeder |
| environment | Entorno donde se ejecutó (local, production, etc.) |
| is_locked | Si el seeder está bloqueado |
| executed_at | Cuándo se ejecutó por primera vez |
| locked_at | Cuándo se bloqueó |
| notes | Notas opcionales |

## 🚀 Uso

### Ver información de seeders

```bash
# Muestra información sobre seeders disponibles, usuarios de desarrollo, etc.
php artisan seeders:info
```

### Ver estado de seeders ejecutados

```bash
# Muestra qué seeders se han ejecutado y cuáles están bloqueados
php artisan seeder:status

# Filtrar por entorno específico
php artisan seeder:status --environment=production
```

### Ejecutar seeders según entorno

El `DatabaseSeeder` detecta automáticamente el entorno y ejecuta los seeders correspondientes:

```bash
# En desarrollo (local, development, dev, testing)
# Los seeders bloqueados NO se vuelven a ejecutar
php artisan db:seed

# En producción
php artisan db:seed --env=production

# Forzar en producción
php artisan db:seed --force
```

### Desbloquear un seeder

```bash
# Desbloquear un seeder específico
php artisan seeder:unlock RoleSeeder

# Desbloquear en un entorno específico
php artisan seeder:unlock RoleSeeder --environment=production

# Desbloquear TODOS los seeders (¡cuidado!)
php artisan seeder:unlock --all
```

### Bloquear un seeder

```bash
# Bloquear un seeder manualmente
php artisan seeder:lock UserSeeder

# Con notas
php artisan seeder:lock UserSeeder --notes="Datos iniciales completos"
```

### Ejecutar seeders específicos

```bash
# Solo seeders de desarrollo
php artisan db:seed --class=Database\\Seeders\\Development\\DevelopmentSeeder

# Solo seeders de producción
php artisan db:seed --class=Database\\Seeders\\Production\\ProductionSeeder

# Seeder específico (respeta locks)
php artisan db:seed --class=Database\\Seeders\\Development\\UserSeeder
```

### Refrescar base de datos con seeders

```bash
# Desarrollo (ejecuta seeders, respeta locks)
php artisan migrate:fresh --seed

# Producción (requiere --force)
php artisan migrate:fresh --seed --force
```

## 📊 Datos Seeded

### Development Environment

#### Usuarios
- **Admin User**
  - Email: `admin@sushigo.com`
  - Password: `admin123456`
  - Role: `super-admin`

- **Demo User**
  - Email: `demo@sushigo.com`
  - Password: `demo123456`
  - Role: `user`

- **Test User**
  - Email: `test@example.com`
  - Password: `password`
  - Role: `user`

- **Random Users**: 10 usuarios generados con Factory

#### Roles (🔒 LOCKED)
- `super-admin`: Acceso total al sistema
- `admin`: Gestión de usuarios
- `manager`: Permisos de gestión limitados
- `user`: Usuario básico

#### Permisos (🔒 LOCKED)
- `users.*`: CRUD de usuarios
- `roles.*`: CRUD de roles
- `permissions.*`: Lectura de permisos

### Production Environment

#### Roles (🔒 LOCKED)
- `super-admin`: Acceso total
- `admin`: Administrador
- `user`: Usuario básico

#### Permisos (🔒 LOCKED)
Los mismos que desarrollo, pero sin usuarios de prueba.

## 🔧 Crear Nuevos Seeders con Tracking

### Clases Base Disponibles

Para simplificar la creación de seeders, usa estas clases base según tu necesidad:

#### 🔒 `LockedSeeder` - Seeders Críticos

Para seeders que deben ejecutarse **UNA sola vez** y **bloquearse** automáticamente:

```php
use Database\Seeders\Base\LockedSeeder;

class RoleSeeder extends LockedSeeder
{
    public function run(): void
    {
        // Se ejecuta UNA vez
        // Se BLOQUEA automáticamente
        // Ideal para: Roles, Permisos, Configuración inicial
    }
}
```

**Características:**
- ✅ Se ejecuta solo una vez
- ✅ Se bloquea automáticamente después de ejecutarse
- ✅ Ideal para: Roles, Permisos, Configuraciones críticas

#### ✓ `OnceSeeder` - Seeders de Datos

Para seeders que deben ejecutarse **UNA vez** pero **NO bloquearse**:

```php
use Database\Seeders\Base\OnceSeeder;

class UserSeeder extends OnceSeeder
{
    public function run(): void
    {
        // Se ejecuta UNA vez
        // NO se bloquea (puede desbloquearse fácilmente)
        // Ideal para: Usuarios, Datos iniciales
    }
}
```

**Características:**
- ✅ Se ejecuta solo una vez
- ❌ No se bloquea (solo se registra)
- ✅ Ideal para: Usuarios, Datos de prueba, Contenido inicial

#### 🔄 `RepeatableSeeder` - Seeders Dinámicos

Para seeders que pueden ejecutarse **múltiples veces**:

```php
use Database\Seeders\Base\RepeatableSeeder;

class DynamicDataSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        // Se ejecuta SIEMPRE
        // NO se bloquea
        // Ideal para: Datos dinámicos, Actualizaciones
    }
}
```

**Características:**
- ✅ Se ejecuta cada vez que se llama `db:seed`
- ❌ No se bloquea
- ✅ Ideal para: Actualizaciones, Datos dinámicos, Sincronización

### 1. Crear el seeder

```bash
php artisan make:seeder Development/ProductSeeder
```

### 2. Elegir la clase base según necesidad

**Opción A: Seeder Crítico (se bloquea)**
```php
<?php

namespace Database\Seeders\Development;

use Database\Seeders\Base\LockedSeeder;

class ProductCategorySeeder extends LockedSeeder
{
    public function run(): void
    {
        // Categorías de productos (solo crear una vez)
        $this->command->info('✓ Product categories seeded successfully');
    }
}
```

**Opción B: Seeder de Datos (no se bloquea)**
```php
<?php

namespace Database\Seeders\Development;

use Database\Seeders\Base\OnceSeeder;

class ProductSeeder extends OnceSeeder
{
    public function run(): void
    {
        // Productos de ejemplo
        $this->command->info('✓ Products seeded successfully');
    }
}
```

**Opción C: Seeder Repetible (siempre se ejecuta)**
```php
<?php

namespace Database\Seeders\Development;

use Database\Seeders\Base\RepeatableSeeder;

class ProductStockSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        // Actualizar stock de productos
        $this->command->info('✓ Product stock updated successfully');
    }
}
```### 3. Comparación Visual

```php
// ❌ ANTES (mucho código repetitivo)
class RoleSeeder extends Seeder
{
    use TrackableSeeder;
    
    protected function shouldLockAfterExecution(): bool { return true; }
    protected function shouldRunOnce(): bool { return true; }
    
    public function run(): void { /* ... */ }
}

// ✅ AHORA (simple y limpio)
class RoleSeeder extends LockedSeeder
{
    public function run(): void { /* ... */ }
}
```

**Beneficios:**
- ✅ Menos código boilerplate
- ✅ Intención clara desde la clase base
- ✅ Más fácil de mantener
- ✅ Menos errores

### 4. Registrar en DevelopmentSeeder

```php
public function run(): void
{
    $this->command->info("🚀 Starting Development Seeders...");
    $this->command->newLine();

    $seeders = [
        RoleSeeder::class,
        PermissionSeeder::class,
        UserSeeder::class,
        UserRoleSeeder::class,
        ProductSeeder::class, // ← Nuevo
    ];

    foreach ($seeders as $seederClass) {
        $seeder = new $seederClass();
        $seeder->setCommand($this->command);
        $seeder();
    }

    $this->command->newLine();
    $this->command->info("✅ Development seeders completed!");
}
```

## 🎯 Buenas Prácticas

### ✅ DO
- Usa `updateOrCreate()` para evitar duplicados
- Separa seeders por entidad (User, Role, Permission, etc.)
- **Usa `LockedSeeder`** para datos críticos del sistema (Roles, Permissions, Config)
- **Usa `OnceSeeder`** para datos iniciales que pueden recrearse (Users, Categorías)
- **Usa `RepeatableSeeder`** para datos que cambian frecuentemente (Stock, Cache)
- Usa el método `command->info()` para mensajes informativos
- Mantén datos sensibles fuera del código (usa `config/seeders.php`)
- Ordena los seeders según dependencias (Roles antes que Permissions)

### 🎨 Guía de Selección de Clase Base

```
¿Este seeder modifica la estructura del sistema?
│
├─ SÍ (Roles, Permisos, Config)
│  └─ Usa LockedSeeder 🔒
│
├─ NO, pero crea datos iniciales importantes
│  └─ Usa OnceSeeder ✓
│
└─ NO, actualiza datos dinámicos
   └─ Usa RepeatableSeeder 🔄
```

### ❌ DON'T
- No uses datos reales de producción en desarrollo
- No mezcles lógica de negocio con seeders
- No crees millones de registros en seeders de desarrollo
- No uses seeders para migraciones de datos
- No desbloquees seeders sin entender las consecuencias

## 🔄 Orden de Ejecución

El orden es importante debido a las dependencias:

1. **RoleSeeder**: Crea los roles → 🔒 SE BLOQUEA
2. **PermissionSeeder**: Crea permisos y los asigna a roles → 🔒 SE BLOQUEA
3. **UserSeeder**: Crea usuarios
4. **UserRoleSeeder**: Asigna roles a usuarios

## 🌍 Detección de Entorno

El sistema detecta automáticamente el entorno usando `app()->environment()`:

- `production` → Ejecuta `ProductionSeeder`
- `local`, `development`, `dev` → Ejecuta `DevelopmentSeeder`
- `testing` → Ejecuta `DevelopmentSeeder`
- Otros → Muestra advertencia

## 🐳 Integración con Docker

El script `init.sh` ejecuta automáticamente:

```bash
php artisan migrate --force
php artisan db:seed --force
php artisan seeder:status
```

Al levantar el proyecto con `docker compose up`, tendrás:
✅ Migraciones aplicadas
✅ Seeders ejecutados (respetando locks)
✅ Datos listos para usar

## 📝 Comandos Artisan Disponibles

| Comando | Descripción |
|---------|-------------|
| `seeders:info` | Muestra información general de seeders |
| `seeder:status` | Muestra estado de seeders ejecutados |
| `seeder:lock {seeder}` | Bloquea un seeder manualmente |
| `seeder:unlock {seeder}` | Desbloquea un seeder |
| `seeder:unlock --all` | Desbloquea todos los seeders |
| `db:seed` | Ejecuta seeders (respeta locks) |
| `db:seed --force` | Ejecuta en producción |

## 🔍 Ejemplo de Flujo Completo

```bash
# 1. Levantar el proyecto por primera vez
docker compose up -d

# Los seeders se ejecutan automáticamente:
# ✓ RoleSeeder ejecutado y bloqueado
# ✓ PermissionSeeder ejecutado y bloqueado
# ✓ UserSeeder ejecutado
# ✓ UserRoleSeeder ejecutado

# 2. Ver estado
php artisan seeder:status
# RoleSeeder       🔒 Locked
# PermissionSeeder 🔒 Locked
# UserSeeder       ✓ Executed
# UserRoleSeeder   ✓ Executed

# 3. Ejecutar seeders nuevamente
php artisan db:seed
# ⚠️  Seeder 'RoleSeeder' is locked. Skipping...
# ⚠️  Seeder 'PermissionSeeder' is locked. Skipping...
# ℹ️  Seeder 'UserSeeder' already executed. Skipping...
# ℹ️  Seeder 'UserRoleSeeder' already executed. Skipping...

# 4. Desbloquear UserSeeder para re-ejecutarlo
php artisan seeder:unlock UserSeeder
php artisan db:seed --class=Database\\Seeders\\Development\\UserSeeder
# 🌱 Running seeder: UserSeeder
# ✓ User created: admin@sushigo.com
# ...

# 5. Bloquear UserSeeder nuevamente
php artisan seeder:lock UserSeeder --notes="Usuarios iniciales configurados"
```

## 🆘 Troubleshooting

### Problema: "Seeder is locked"
**Solución**: Es intencional. Si necesitas re-ejecutar:
```bash
php artisan seeder:unlock NombreDelSeeder
```

### Problema: "Seeder already executed"
**Solución**: El seeder tiene `runOnce = true`. Desbloquéalo o ejecuta con `--force`:
```bash
php artisan seeder:unlock NombreDelSeeder
```

### Problema: Quiero resetear todos los seeders
**Solución**:
```bash
php artisan migrate:fresh --seed
# O desbloquear todos:
php artisan seeder:unlock --all
```

## 📚 Recursos

- Configuración: `config/seeders.php`
- Modelo: `app/Models/SeederLog.php`
- Trait: `database/seeders/Traits/TrackableSeeder.php`
- Comandos: `app/Console/Commands/Seeder*.php`

---

**End of Documentation v2.0**
Sistema de Seeders con Tracking & Locking implementado exitosamente! 🎉
