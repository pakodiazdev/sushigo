# 💲 Precios de Producto — Arquitectura

**Alcance**
El dominio autoritativo de precio de venta para Variantes de Producto: `PriceList` con vigencia
efectiva, su asignación a un Branch (o, más específicamente, a un Operating Unit dentro de él),
entradas de precio por Variante, resolución determinista, y los invariantes de conflicto/traslape
que mantienen la resolución sin ambigüedad. Producido por el
[issue #435](https://github.com/pakodiazdev/sushigo/issues/435). `ItemVariant.sale_price`
**nunca** es leído por nada de esto — ver §5.

Este documento complementa
[Product Inventory — Target Architecture & Migration Plan](../product-catalog/product-catalog-architecture.en.md)
(que ya anticipaba este diseño en su §7 y §8.1) e
[Inventory Architecture & Design](../inventory-architecture.en.md), que es dueño de
`Branch`/`OperatingUnit`.

---

## 1. Forma del dominio

```
PriceList  ──< PriceListAssignment >── Branch (requerido) ── OperatingUnit (override opcional)
    │
    └──< VariantPrice >── ItemVariant
```

- **`PriceList`** — contenedor nombrado y priorizado (`code`, `name`, `priority`, `is_active`). No
  está atado a ningún branch — la misma lista puede asignarse a muchos contextos (p. ej. una lista
  "Standard" asignada a cada branch, o una lista "Evento de Verano" asignada a un `OperatingUnit`
  temporal).
- **`PriceListAssignment`** — asigna una `PriceList` a exactamente un contexto: un `Branch`
  (`branch_id`, siempre requerido) o, más específicamente, un `OperatingUnit` dentro de ese branch
  (`operating_unit_id`, nullable). Tiene su propia vigencia `effective_from`/`effective_to` y bandera
  `is_active`, independiente de las filas `VariantPrice` que gobierna.
- **`VariantPrice`** — el precio real de un `ItemVariant` dentro de una `PriceList`, con su propia
  vigencia y bandera `is_active`. Almacenamiento monetario exacto: columna `decimal(15,4)` + cast
  Eloquent `decimal:4`, la misma convención que ya usan `ItemVariant.sale_price`/`last_unit_cost` y
  `StockMovementLine.sale_price` — sin una nueva librería de value-object Money.

  **As-built frente al objetivo de Sprint 8.** El párrafo anterior registra la implementación
  entregada por #435. [TD-05](../../decisions/td-05-monetary-precision-and-rounding.md) la sustituye
  como contrato objetivo: un `VariantPrice.price` visible al cliente es Money con escala 2 y no
  debe cruzar una frontera de punto flotante binario. El costo unitario sigue siendo una tasa
  distinta con escala 4. El issue #415 es dueño de la migración compatible y de las
  representaciones exactas en PHP/API/TypeScript; hasta entregarlo, `decimal(15,4)` continúa como
  almacenamiento as-built de precios.

## 2. Precedencia Branch vs. Operating Unit

Todo `OperatingUnit` ya pertenece a exactamente un `Branch` (ver
`product-catalog-architecture.en.md` §8.1). Branch es el objetivo primario de asignación — el caso
común es "esta lista aplica a este branch". Una asignación a nivel Operating Unit es un override
estrictamente más específico dentro de ese mismo branch (p. ej. una unidad temporal `EVENT_TEMP`
con precios distintos a los de su branch padre), replicando la misma forma `branch_id` (requerido)
+ `operating_unit_id` (override nullable) que ya usa `cash_registers` — no un patrón polimórfico
nuevo `context_type`/`context_id`, ya que ninguno existía para este tipo de scoping en el resto del
código.

## 3. Algoritmo de resolución

`App\Services\Pricing\PriceResolutionService::resolve(ItemVariant $variant, int $branchId, ?int
$operatingUnitId, ?Carbon $asOf = null): PriceResolutionResult`

1. `$asOf` por defecto es "ahora"; la comparación es a nivel de día (`effective_from`/
   `effective_to` son columnas `date`).
2. Construye hasta dos niveles ordenados de candidatos, el más específico primero:
   - **Nivel 1** (solo si se da un Operating Unit): asignaciones activas para ese
     `branch_id` + `operating_unit_id` exactos, cuya `PriceList` esté activa, cuya vigencia
     contenga `$asOf`.
   - **Nivel 2**: asignaciones activas para `branch_id` con `operating_unit_id IS NULL`, mismos
     filtros de actividad/vigencia.
   Dentro de un nivel, se ordena por `PriceList.priority` (desc), luego `id` de la asignación (asc)
   como desempate defensivo — §4 ya prohíbe un empate genuino de prioridad dentro de un mismo nivel.
3. Recorre las asignaciones del nivel 1 en orden, luego las del nivel 2: para cada una, busca un
   `VariantPrice` activo para esta Variante en la `PriceList` de esa asignación cuya vigencia
   contenga `$asOf`. **Devuelve el primero que encuentre.** Esto es un layering intencional — una
   lista más específica o de mayor prioridad que simplemente no tiene precio para esta Variante en
   particular cae al siguiente candidato, en vez de resolver a "sin precio" prematuramente.
4. Si ningún nivel produce un precio, devuelve un **resultado explícito de sin-precio**
   (`resolved: false`) — nunca una excepción, nunca `ItemVariant.sale_price`.

`GET /api/v1/pricing/resolve` expone esto vía HTTP y siempre responde `200`, incluso cuando
`resolved: false` — "sin precio configurado para este contexto" es una respuesta de dominio válida,
no un error.

## 4. Invariantes de conflicto / traslape

Dos servicios son dueños de las garantías en escritura de las que depende el algoritmo anterior,
ambos seguros ante condiciones de carrera (`DB::transaction` + `lockForUpdate`, replicando el patrón
de `App\Services\Inventory\VariantPurchasePresentationService`):

- **`PriceListAssignmentService`** — un `operating_unit_id`, si se da, debe pertenecer al
  `branch_id` dado. Dos asignaciones **activas** al mismo contexto exacto (`branch_id` +
  `operating_unit_id`, `NULL` cuenta como su propio valor) nunca pueden compartir la misma
  prioridad de `PriceList` mientras sus vigencias se traslapen — esa combinación específica es lo
  único que podría hacer ambiguo el paso 3 anterior. Prioridades distintas que se traslapan está
  bien y es esperado (eso es el layering).
- **`VariantPriceService`** — el mismo `ItemVariant` nunca puede tener dos filas `VariantPrice`
  **activas** en la misma `PriceList` con vigencias que se traslapen — una sola lista siempre debe
  dar un precio determinista para una Variante en un instante dado.

Ambos usan un predicado de traslape de intervalos compartido (`EvaluatesEffectiveRanges`):
`effective_from <= COALESCE(other.effective_to, sentinel) AND (effective_to IS NULL OR
effective_to >= other.effective_from)`, usando una fecha centinela lejana en vez de un literal
`infinity` específico del motor de base de datos.

## 5. Nunca `ItemVariant.sale_price`

`ItemVariant.sale_price` (y `last_unit_cost`/`avg_unit_cost`/`min_stock`/`max_stock`) siguen
existiendo como columnas — se conservan hasta que #434 (costo) y #439 (umbrales) aterricen, según
`product-catalog-architecture.en.md` §7 Milestone C — pero nada en este dominio las lee. Ningún
formulario de Producto/Variante recupera un campo de precio de venta por defecto (ninguno existe hoy
en el contrato actual de solo-identidad-de-catálogo de #424; este issue no reintroduce uno). Una
prueba de regresión (`PriceResolutionTest::it_never_falls_back_to_item_variant_sale_price`)
establece `sale_price` en una Variante sin ningún `VariantPrice`/asignación configurados y verifica
que el endpoint de resolución siga devolviendo `resolved: false`.

## 6. Autorización

- **`PriceListPolicy`** — validaciones planas de permiso (`price_lists.view`/`.create`/`.update`/
  `.delete`). Una `PriceList` no pertenece a ningún branch, por lo que no aplica scoping de branch
  aquí.
- **`PriceListAssignmentPolicy`** — el recurso con scope de branch, usando el mismo trait
  `ChecksBranchAccess` que `CashRegisterPolicy`: `view`/`update`/`delete` requieren adicionalmente
  una asignación activa de `OperatingUnit` en el branch de la propia asignación. `create` se valida
  en el `FormRequest` mismo (aún no existe una instancia que verificar). Esto es lo que satisface el
  criterio de aceptación "la autorización previene la gestión de precios entre contextos".
- El CRUD de `VariantPrice` no tiene permiso propio — es un sub-recurso de una `PriceList` que quien
  llama ya puede `view`/`update` (el mismo razonamiento que `VariantPurchasePresentation` ya usa
  para reutilizar `items.*` en vez de crear un nuevo espacio de permisos).
- `GET /pricing/resolve` solo requiere `price_lists.view` — el criterio de aceptación habla de
  "gestión" (escritura); leer un precio resuelto para un contexto no requiere acceso de branch.

## 7. Puntos de extensión futuros (canal / cliente / promoción)

Este issue deliberadamente entrega solo precios con contexto Branch/OperatingUnit — sin
dimensiones de canal, cliente o promoción, y sin resolución respaldada por Redis. El contrato base
está construido para que esas capas se agreguen **sin cambiar `PriceList`, `VariantPrice`, ni la
firma del punto de entrada de resolución**:

- Una nueva **dimensión** de precio (p. ej. canal de venta, segmento de cliente) es un predicado
  adicional sobre `PriceListAssignment` (o una tabla de asignación hermana con la misma forma), no
  un rediseño de `PriceList`/`VariantPrice` — el sistema de niveles del algoritmo de resolución
  (§3) ya generaliza a "más niveles de candidatos, el más específico primero".
- Una **promoción** (descuento apilable y acotado en el tiempo) es naturalmente otra `PriceList`
  con mayor `priority` y una vigencia `effective_from`/`effective_to` corta, asignada al mismo
  contexto que la(s) lista(s) que temporalmente sobrescribe — no requiere cambio de esquema, ya que
  el comportamiento de caída del §3 ya maneja "esta lista no tiene precio para cada Variante".
- Una **capa de caché**, si el volumen de resolución alguna vez lo requiere, se ubica enteramente
  dentro de la implementación de `PriceResolutionService` — la firma de `resolve()` y el contrato
  `PriceResolutionResult` no necesitan cambiar para quienes lo consumen.

---

Ver también: `App\Services\Pricing\PriceResolutionService`,
`App\Services\Pricing\PriceListAssignmentService`, `App\Services\Pricing\VariantPriceService`,
`code/api/tests/Feature/Pricing/`.
