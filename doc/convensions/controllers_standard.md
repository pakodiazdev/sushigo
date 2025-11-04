# Controllers, Requests, and Responses Standard

> **Scope:** ComandaFlow / SushiGo · Laravel 12 · PHP 8.3 ·
> l5-swagger/OpenAPI 3

This document defines how we structure **controllers**,
**FormRequests**, **Responses**, and **Swagger schemas** to maintain
clean, consistent, and well-documented code. The goal is to respect the
**Single Responsibility Principle (SRP)**, promote **Single Action
Controllers (SAC)**, centralize validation in **FormRequest**,
**standardize responses**, and **reuse documentation**.

------------------------------------------------------------------------

## 1) Principles

1.  **Single Action Controllers (SAC)**
    -   Each controller handles **only one action** via `__invoke()`.
    -   No multi-method `ResourceController`.
    -   Business logic resides in injected **Services/Actions**.
2.  **Separation of Input/Output**
    -   **Input** → `FormRequest` (validation + transformation +
        authorization).
    -   **Output** → `Response` (implements `Responsable`, encapsulates
        `status`, `headers`, `payload`).
3.  **Reusable Swagger Schemas**
    -   **Request/Response schemas** live next to their classes.
    -   **Controllers only reference** schemas.
4.  **Unified Error Format**
    -   All errors follow a **common error schema**.

------------------------------------------------------------------------

## 2) Folder Structure

``` bash
app/
  Actions/
    Suppliers/
      CreateSupplier.php
      UpdateSupplier.php
  Http/
    Controllers/
      Api/
        V1/
          Suppliers/
            CreateSupplierController.php
            UpdateSupplierController.php
            ShowSupplierController.php
            ListSuppliersController.php
            DeleteSupplierController.php
    Requests/
      Suppliers/
        CreateSupplierRequest.php
        UpdateSupplierRequest.php
        ListSuppliersRequest.php
    Responses/
      Common/
        ResponseEntity.php
        ResponsePaginated.php
        ResponseMessage.php
        ResponseError.php
      Entities/
        UserResponse.php
        SupplierResponse.php
        ProductResponse.php
      Suppliers/
        SupplierCreatedResponse.php
        SupplierUpdatedResponse.php
        SupplierDeletedResponse.php
  Models/
    Supplier.php

routes/
  api.php
```

------------------------------------------------------------------------

## 3) Naming Conventions

-   **Controllers**: `Create{Entity}Controller`,
    `Update{Entity}Controller`, etc.
-   **Requests**: `{Action}{Entity}Request`.
-   **Base Responses**: `ResponseEntity`, `ResponsePaginated`,
    `ResponseMessage`, `ResponseError`.
-   **Entity Responses**: `Response{Entity}Created`,
    `Response{Entity}Updated`, etc.
-   **HTTP Status Responses**: specific classes when clarity improves
    readability.

------------------------------------------------------------------------

## 4) Routes and Versioning

``` php
Route::prefix('v1')->group(function () {
    Route::post('suppliers', CreateSupplierController::class)->name('suppliers.create');
    Route::put('suppliers/{id}', UpdateSupplierController::class)->name('suppliers.update');
    Route::get('suppliers/{id}', ShowSupplierController::class)->name('suppliers.show');
    Route::get('suppliers', ListSuppliersController::class)->name('suppliers.list');
    Route::delete('suppliers/{id}', DeleteSupplierController::class)->name('suppliers.delete');
});
```

------------------------------------------------------------------------

## 5) FormRequest

Rules: - Implement `authorize()` and `rules()`. - Transformations in
`prepareForValidation()`. - Swagger schema is documented in the same
class.

``` php
/**
 * @OA\Schema(
 *   schema="CreateSupplierRequestSchema",
 *   required={"name"},
 *   @OA\Property(property="name", type="string", example="Sushi Wholesale SA de CV"),
 *   @OA\Property(property="email", type="string", format="email", example="compras@sushi.com"),
 * )
 */
class CreateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Supplier::class);
    }

    public function rules(): array
    {
        return [
            'name'  => ['required','string','max:160'],
            'email' => ['nullable','email','max:160'],
        ];
    }
}
```

------------------------------------------------------------------------

## 6) Responses

-   Implement `Responsable`.
-   Return unified JSON structure:
    `{ status, data, meta, errors, message }`.
-   Document each schema with OpenAPI annotations.

### 6.1) Base Response (Common)

Base response classes that implement `Responsable` and return standardized JSON structures:

``` php
/** @OA\Schema(
 *   schema="ResponseEntity",
 *   @OA\Property(property="status", type="integer", example=200),
 *   @OA\Property(property="data", type="object"),
 *   @OA\Property(property="meta", type="object")
 * )
 */
class ResponseEntity implements Responsable
{
    public function __construct(
        protected array $data,
        protected int $status = 200,
        protected array $meta = []
    ) {}

    public function toResponse($request): JsonResponse
    {
        return response()->json([
            'status' => $this->status,
            'data'   => (object) $this->data,
            'meta'   => (object) $this->meta,
        ], $this->status);
    }
}
```

### 6.2) Entity Response Schemas (Entities)

Entity responses are **documentation-only classes** that define the OpenAPI schema for entity representations. They are placed in `app/Http/Responses/Entities/` and are referenced by controllers and other responses.

**Purpose:**
- Define reusable OpenAPI schemas for entities
- Centralize entity documentation
- Avoid duplicating entity structure across multiple endpoints
- No logic implementation needed (pure documentation)

**Example:**

``` php
<?php

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="SupplierResponse",
 *     title="Supplier Response",
 *     description="Supplier entity representation",
 *     @OA\Property(property="id", type="integer", example=1, description="Supplier ID"),
 *     @OA\Property(property="name", type="string", example="Sushi Wholesale SA", description="Supplier name"),
 *     @OA\Property(property="email", type="string", format="email", example="contact@supplier.com", description="Contact email"),
 *     @OA\Property(property="phone", type="string", example="+52 55 1234 5678", description="Contact phone"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2024-01-01T00:00:00.000000Z", description="Creation timestamp"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2024-01-15T10:30:00.000000Z", description="Last update timestamp")
 * )
 */
class SupplierResponse
{
    // This class is used only for OpenAPI documentation
    // It represents the Supplier entity schema in Swagger
}
```

**Usage in Controllers:**

``` php
/**
 * @OA\Get(
 *   path="/api/v1/suppliers/{id}",
 *   summary="Get Supplier by ID",
 *   tags={"Suppliers"},
 *   @OA\Response(
 *       response=200,
 *       description="Supplier retrieved successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(
 *                  @OA\Property(property="data", ref="#/components/schemas/SupplierResponse")
 *              )
 *           }
 *       )
 *   )
 * )
 */
```

**Naming Convention:**
- `{Entity}Response.php` - e.g., `UserResponse`, `SupplierResponse`, `ProductResponse`
- Place in `app/Http/Responses/Entities/`
- Include all entity fields with proper types, examples, and descriptions

------------------------------------------------------------------------

## 7) Example Controller

``` php
/**
 * @OA\Post(
 *   path="/api/v1/suppliers",
 *   summary="Create Supplier",
 *   tags={"Suppliers"},
 *   @OA\RequestBody(
 *       required=true,
 *       @OA\JsonContent(ref="#/components/schemas/CreateSupplierRequestSchema")
 *   ),
 *   @OA\Response(
 *       response=201,
 *       description="Created",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/SupplierResponse"))
 *           }
 *       )
 *   ),
 *   @OA\Response(
 *       response=422,
 *       description="Validation Error",
 *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
 *   )
 * )
 */
class CreateSupplierController extends Controller
{
    public function __construct(private CreateSupplier $action) {}

    public function __invoke(CreateSupplierRequest $request)
    {
        $supplier = ($this->action)($request->validated());
        return new ResponseEntity(
            data: [
                'id'         => $supplier->id,
                'name'       => $supplier->name,
                'email'      => $supplier->email,
                'created_at' => $supplier->created_at,
                'updated_at' => $supplier->updated_at,
            ],
            status: 201,
            meta: ['location' => route('suppliers.show', $supplier->id)]
        );
    }
}
```

------------------------------------------------------------------------

## 8) HTTP Responses Catalog

**2xx** - `ResponseEntity` (200) - `ResponsePaginated` (200) -
`ResponseMessage` (200) - `Response{Entity}Created` (201) -
`Response{Entity}Updated` (200/204) - `Response{Entity}Deleted`
(204/200)

**4xx/5xx** (based on `ResponseError`) - `ResponseBadRequest` (400) -
`ResponseUnauthorized` (401) - `ResponseForbidden` (403) -
`ResponseNotFound` (404) - `ResponseConflict` (409) -
`ResponseUnprocessableEntity` (422) - `ResponseTooManyRequests` (429) -
`ResponseServerError` (500)

------------------------------------------------------------------------

## 9) Checklist for Pull Requests

-   [ ] Invokable controller only.
-   [ ] Uses FormRequest for validation.
-   [ ] Uses proper Response class.
-   [ ] Swagger annotations reference existing schemas.
-   [ ] Errors mapped through Handler.
-   [ ] Includes basic tests.

------------------------------------------------------------------------

**End of Standard v1.**\
Keep evolving it with versioned PRs.
