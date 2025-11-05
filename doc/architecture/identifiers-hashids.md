# 🔐 Identificadores Ofuscados con Hashids

## 1. Objetivo

Los servicios del tenant SushiGo exponen REST APIs abiertas a clientes externos. Para reducir vectores de enumeración y fuga de metadatos, **ningún ID incremental debe exponerse directamente**. Este documento describe por qué adoptamos `Hashids`, cómo configurar el ecosistema Laravel, y qué ajustes requiere la inyección de modelos y validaciones.

---

## 2. Riesgos al exponer IDs autoincrementales

| Riesgo | Descripción |
|--------|-------------|
| **Enumeración masiva** | Los IDs secuenciales permiten recorrer `/api/v1/items/1..n` sin esfuerzo y descubrir recursos ajenos. |
| **Filtración de negocios** | El ritmo de crecimiento real del negocio queda expuesto (cantidad de pedidos, usuarios, etc.). |
| **Ataques de autorización** | Un ID intuitivo facilita ataques “IDOR” si algún endpoint carece de políticas estrictas. |
| **Ingeniería social** | El correlativo revela la existencia de entidades sensibles (e.g. proveedores, pagos). |

Hashids evita patrones secuenciales y ofrece identificadores cortos, reversibles y consistentes.

---

## 3. ¿Qué es Hashids?

[Hashids](https://hashids.org/php/) genera identificadores únicos y opacos a partir de números enteros. Características relevantes:

- Reversible: se puede decodificar al entero original con la misma sal y alfabeto.
- Determinístico: mismo entero + sal → mismo hash (idempotencia para URLs).
- Soporta diferentes alfabetos, longitud mínima, y múltiples claves.

Implementaremos la librería oficial para Laravel [`vinkla/hashids`](https://github.com/vinkla/hashids).

---

## 4. Configuración en Laravel

1. **Dependencia**
   ```bash
   composer require vinkla/hashids
   ```

2. **Config publish** (generará `config/hashids.php`)
   ```bash
   php artisan vendor:publish --provider="Vinkla\Hashids\HashidsServiceProvider"
   ```

3. **Sal y longitud mínima**
   - Definir `HASHIDS_SALT` en `.env` (uno por proyecto, largo y aleatorio).
   - Ajustar `min_length` si queremos IDs de al menos 8 caracteres.

   ```env
   HASHIDS_SALT="base64:..."
   HASHIDS_LENGTH=8
   ```

4. **Binding del servicio**
   Laravel resolverá `app('hashids')` o `Hashids::class` usando la config anterior.

---

## 5. Trait `HasHashid`

Incorporaremos un trait reusable en `app/Support/Traits/HasHashid.php` (o similar):

```php
namespace App\Support\Traits;

trait HasHashid
{
    public function getHashidAttribute(): string
    {
        return app('hashids')->encode($this->getKey());
    }

    public function getRouteKey(): string
    {
        return $this->hashid;
    }

    public function resolveRouteBinding($value, $field = null)
    {
        $decoded = app('hashids')->decode($value);

        if (empty($decoded)) {
            return null;
        }

        return $this->newQuery()->find($decoded[0]);
    }
}
```

- `getRouteKey()` garantiza que al serializar rutas (`route('users.show', $user)`) se use el hash.
- `resolveRouteBinding()` habilita inyección automática (`__invoke(User $user)`) incluso cuando la URL recibió un hash.

Se habilita en cada modelo expuesto públicamente:

```php
class User extends Authenticatable
{
    use HasHashid;
    // ...
}
```

---

## 6. Ajustes en rutas y controladores

- **Route Model Binding**: no requiere cambios adicionales; Laravel llamará a `resolveRouteBinding()` al inyectar modelos por tipo.

  ```php
  Route::get('/users/{user}', ShowUserController::class);
  // Controller
  public function __invoke(User $user) { ... }
  ```

- **FormRequests**: cuando validemos IDs en payloads (`items.*.id`), usar reglas personalizadas que acepten hashids y decodifiquen antes de tocar la base de datos.

  ```php
  public function prepareForValidation()
  {
      $this->merge([
          'item_id' => $this->decodeHash($this->input('item_id')),
      ]);
  }
  ```

  El helper `decodeHash` debe devolver `null` o lanzar `ValidationException` si el hash sigue inválido.

- **Serializadores / Resources**: exponer el hash en las respuestas (`'id' => $this->hashid`) y ocultar `id` interno (`$hidden = ['id']` o mapear manualmente).

---

## 7. Consideraciones adicionales

- **Pruebas**: crear helpers `hashid($model)` y `decode_hash($hash)` en suites de tests para simplificar assertions.
- **Seeds / Fixtures**: cuando se documenten ejemplos en la API, usar hashids reales generados durante tests o fijos provenientes de `Hashids::encode`.
- **Logs**: conservar el ID real en logs internos para debugging, pero evitar exponerlos en respuestas o mensajes de error dirigidos a clientes.
- **Integraciones**: cualquier servicio externo que necesite correlaciones debe trabajar con hashids; documentar esta política en contratos.

---

## 8. Relacionado

- [Laravel Route Model Binding](https://laravel.com/docs/routing#route-model-binding)
- [Hashids PHP Docs](https://hashids.org/php/)
- Documento de arquitectura general: `doc/architecture/inventory-architecture.md` (ver sección de capas y servicios).
