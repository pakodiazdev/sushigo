# API Project Rules & Conventions

Reglas y convenciones establecidas para el proyecto sushigo-api.

## 📋 Tabla de Contenidos

- [Documentación](#documentación)
- [Código](#código)
- [Estructura de Archivos](#estructura-de-archivos)
- [Seeders](#seeders)
- [Swagger/OpenAPI](#swaggeropenapi)
- [Configuración](#configuración)

---

## 📚 Documentación

### PHPDoc

**❌ NO usar PHPDoc cuando el tipado de PHP es suficiente:**

```php
// ❌ MAL - PHPDoc redundante
/**
 * Get the user's name.
 * @return string
 */
public function getName(): string
{
    return $this->name;
}

// ✅ BIEN - Tipado fuerte sin PHPDoc
public function getName(): string
{
    return $this->name;
}
```

**✅ USAR PHPDoc solo cuando agregue valor:**

```php
// ✅ BIEN - Documenta lógica compleja o contexto de negocio
/**
 * Calculate user discount based on loyalty points and purchase history.
 * Applies tier-based discounts: Bronze (5%), Silver (10%), Gold (15%)
 */
public function calculateDiscount(User $user): float
{
    // ...
}
```

### Propiedades de Clase

**Usar tipado fuerte en lugar de anotaciones:**

```php
// ❌ MAL
/**
 * @var string
 */
protected $signature = 'command:name';

// ✅ BIEN
protected string $signature = 'command:name';

// ⚠️ ACEPTABLE - Cuando no se puede tipar directamente
protected $fillable = ['name', 'email'];
protected $casts = ['is_active' => 'boolean'];
```

### Comentarios Inline

**Evitar comentarios obvios o superfluos:**

```php
// ❌ MAL - Comentarios que repiten el código
// Create roles
$roles = ['admin', 'user'];

// Assign permissions
$role->syncPermissions($permissions);

// ✅ BIEN - Sin comentarios superfluos
$roles = ['admin', 'user'];
$role->syncPermissions($permissions);

// ✅ BIEN - Comentario que agrega contexto
// Prevent race condition when multiple workers process the same job
$this->lock()->get();
```

---

## 💻 Código

### Tipado

**Siempre usar tipado fuerte en PHP 8.2:**

```php
// ✅ Parámetros y retornos tipados
public function createUser(string $name, string $email): User
{
    return User::create(['name' => $name, 'email' => $email]);
}

// ✅ Propiedades tipadas
protected string $table = 'users';
protected array $fillable = ['name', 'email'];

// ✅ Tipos nullable explícitos
public function findUser(?int $id): ?User
{
    return $id ? User::find($id) : null;
}
```

### Laravel Best Practices

```php
// ✅ Usar updateOrCreate para evitar duplicados
Role::updateOrCreate(
    ['name' => $roleName, 'guard_name' => 'api'],
    ['description' => 'Role description']
);

// ✅ Usar métodos descriptivos
public function isAdmin(): bool
{
    return $this->hasRole('admin');
}

// ✅ Evitar lógica de negocio en controladores
// Usar Services, Actions o Domain Logic
```

---

## 📁 Estructura de Archivos

### Responses vs Resources

**Entity Responses (Solo para Swagger/OpenAPI):**

```
app/Http/Responses/Entities/
├── UserResponse.php
├── RoleResponse.php
└── PermissionResponse.php
```

Estas clases son **solo para documentación** de Swagger, no contienen lógica:

```php
/**
 * @OA\Schema(
 *     schema="UserResponse",
 *     type="object"
 * )
 */
class UserResponse
{
    /**
     * @OA\Property(type="integer")
     */
    public int $id;

    /**
     * @OA\Property(type="string")
     */
    public string $name;
}
```

**Resources (Para transformar datos):**

```
app/Http/Resources/
├── UserResource.php
├── UserCollection.php
└── RoleResource.php
```

Estas clases transforman modelos a JSON:

```php
class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
        ];
    }
}
```

### Naming Conventions

```
✅ Controllers: UserController, AuthController
✅ Models: User, Role, Permission
✅ Seeders: UserSeeder, RoleSeeder
✅ Commands: SeederLock, SeederUnlock (sin sufijo Command)
✅ Responses: UserResponse, RoleResponse
✅ Resources: UserResource, UserCollection
```

---

## 🌱 Seeders

### Sistema de Base Classes

**Usar las clases base según el propósito:**

```php
// 🔒 LockedSeeder - Datos críticos que se bloquean
class RoleSeeder extends LockedSeeder
{
    public function run(): void
    {
        // Se ejecuta UNA vez y se BLOQUEA automáticamente
        Role::updateOrCreate(['name' => 'admin'], ['guard_name' => 'api']);
    }
}

// ✓ OnceSeeder - Datos iniciales que no se bloquean
class UserSeeder extends OnceSeeder
{
    public function run(): void
    {
        // Se ejecuta UNA vez pero NO se bloquea
        User::factory(10)->create();
    }
}

// 🔄 RepeatableSeeder - Datos dinámicos
class CacheSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        // Se ejecuta SIEMPRE
        Cache::flush();
    }
}
```

### Guía de Selección

```
¿Modifica estructura del sistema? (Roles, Permisos, Config)
└─ Usa LockedSeeder 🔒

¿Crea datos iniciales importantes? (Users, Categorías)
└─ Usa OnceSeeder ✓

¿Actualiza datos dinámicos? (Stock, Cache, Sync)
└─ Usa RepeatableSeeder 🔄
```

### Best Practices

```php
// ✅ DO
class UserSeeder extends OnceSeeder
{
    public function run(): void
    {
        $users = config('seeders.development_users', []);

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }
    }
}

// ❌ DON'T
class UserSeeder extends OnceSeeder
{
    public function run(): void
    {
        // No usar datos hardcodeados sensibles
        User::create([
            'email' => 'admin@example.com',
            'password' => 'password123', // ❌
        ]);

        // No mezclar lógica de negocio
        $user = User::first();
        $user->sendWelcomeEmail(); // ❌
    }
}
```

---

## 📖 Swagger/OpenAPI

### Configuración de URLs

**Usar variables de entorno:**

```php
// config/l5-swagger.php
'servers' => [
    [
        'url' => env('API_URL', env('APP_URL', 'http://localhost:8080')),
        'description' => 'API Server',
    ],
],
```

```bash
# .env
API_URL=http://localhost:8080
```

### Entity Responses

**Documentar en carpeta dedicada:**

```php
namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="UserResponse",
 *     type="object",
 *     title="User Response"
 * )
 */
class UserResponse
{
    /**
     * @OA\Property(type="integer", example=1)
     */
    public int $id;

    /**
     * @OA\Property(type="string", example="John Doe")
     */
    public string $name;
}
```

### Controller Documentation

```php
/**
 * @OA\Get(
 *     path="/api/users/{id}",
 *     tags={"Users"},
 *     summary="Get user by ID",
 *     @OA\Response(
 *         response=200,
 *         ref="#/components/schemas/UserResponse"
 *     )
 * )
 */
public function show(int $id): JsonResponse
{
    return response()->json(User::findOrFail($id));
}
```

### UI Customizations

**Ajustes de interfaz en `resources/views/vendor/l5-swagger/index.blade.php`:**

```css
/* Posición del botón de login */
.custom-login-button {
    top: 70px; /* Evitar solapamiento con selector de definiciones */
}
```

---

## ⚙️ Configuración

### Archivos de Configuración

**Centralizar configuraciones:**

```php
// config/seeders.php
return [
    'environments' => [
        'local' => DevelopmentSeeder::class,
        'development' => DevelopmentSeeder::class,
        'production' => ProductionSeeder::class,
    ],

    'development_users' => [
        [
            'name' => 'Admin User',
            'email' => 'admin@sushigo.com',
            'password' => 'admin123456',
            'role' => 'super-admin',
        ],
    ],
];
```

### Variables de Entorno

**Variables obligatorias:**

```bash
# .env

# Application
APP_NAME=SushiGo
APP_ENV=local
APP_URL=http://localhost:8080

# API
API_URL=http://localhost:8080

# Database
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=sushigo
DB_USERNAME=postgres
DB_PASSWORD=secret

# Laravel Passport
PASSPORT_PRIVATE_KEY=...
PASSPORT_PUBLIC_KEY=...
```

---

## 🐳 Docker

### Estructura

```
docker/
├── dev/
│   ├── Dockerfile
│   └── config/          # ✅ CORRECTO (no "cofig")
│       ├── dev/
│       │   └── init.sh
│       └── prod/
└── prod/
```

### Init Script

**El script `init.sh` debe:**

```bash
#!/bin/bash

# 1. Aplicar migraciones
php artisan migrate --force

# 2. Ejecutar seeders (respeta locks)
php artisan db:seed --force

# 3. Mostrar estado de seeders
php artisan seeder:status

# 4. Generar documentación Swagger
php artisan l5-swagger:generate
```

---

## 📊 Comandos Artisan Disponibles

### Seeders

```bash
# Información general
php artisan seeders:info

# Estado de ejecución
php artisan seeder:status
php artisan seeder:status --environment=production

# Bloquear/Desbloquear
php artisan seeder:lock RoleSeeder --notes="Critical data"
php artisan seeder:unlock UserSeeder
php artisan seeder:unlock --all

# Ejecutar seeders
php artisan db:seed
php artisan db:seed --class=Database\\Seeders\\Development\\UserSeeder
php artisan migrate:fresh --seed
```

### Swagger

```bash
# Generar documentación
php artisan l5-swagger:generate

# Ver documentación
# http://localhost:8080/api/documentation
```

---

## ✅ Checklist para Nuevas Features

### Antes de Commit

- [ ] Eliminar PHPDoc innecesario (usar tipado fuerte)
- [ ] Eliminar comentarios superfluos
- [ ] Usar `updateOrCreate` en seeders para evitar duplicados
- [ ] Configurar seeders con clase base apropiada (Locked/Once/Repeatable)
- [ ] Documentar endpoints en Swagger si es API pública
- [ ] Usar Entity Responses para schemas de Swagger
- [ ] Configuración en archivos `.php`, no hardcodeada
- [ ] Variables sensibles en `.env`

### Testing

- [ ] Probar seeders: `php artisan migrate:fresh --seed`
- [ ] Verificar locks: `php artisan seeder:status`
- [ ] Generar Swagger: `php artisan l5-swagger:generate`
- [ ] Verificar tipos con análisis estático (si aplica)

---

## 🚫 Anti-Patterns

### Evitar

```php
// ❌ PHPDoc redundante con tipado
/**
 * @var string
 */
protected $name;

// ❌ Comentarios obvios
// Get all users
$users = User::all();

// ❌ Lógica de negocio en controllers
public function store(Request $request)
{
    $user = new User();
    $user->name = $request->name;
    $user->calculateDiscount(); // ❌
    $user->sendEmail(); // ❌
    $user->save();
}

// ❌ Datos sensibles hardcodeados
$password = 'admin123'; // ❌

// ❌ Seeders sin tracking
class RoleSeeder extends Seeder // ❌ Usar base classes
{
    public function run(): void
    {
        Role::create(['name' => 'admin']);
    }
}
```

### Preferir

```php
// ✅ Tipado fuerte sin PHPDoc
protected string $name;

// ✅ Código auto-explicativo
$users = User::all();

// ✅ Lógica en Services/Actions
public function store(StoreUserRequest $request)
{
    return $this->userService->createUser($request->validated());
}

// ✅ Configuración en archivos
$users = config('seeders.development_users');

// ✅ Seeders con tracking
class RoleSeeder extends LockedSeeder
{
    public function run(): void
    {
        Role::updateOrCreate(['name' => 'admin'], []);
    }
}
```

---

## 📚 Referencias

- Documentación Laravel: https://laravel.com/docs
- PSR-12 Coding Standard: https://www.php-fig.org/psr/psr-12/
- OpenAPI Specification: https://swagger.io/specification/
- Laravel Spatie Permissions: https://spatie.be/docs/laravel-permission
- L5-Swagger: https://github.com/DarkaOnLine/L5-Swagger

---

**Última actualización:** Noviembre 4, 2025
**Versión:** 1.0
**Proyecto:** sushigo-api (Laravel 12.x + PHP 8.2)
