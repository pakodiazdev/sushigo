<?php

namespace Tests\Feature\Inventory;

use Illuminate\Support\Facades\Artisan;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Regression check for #581: the generated OpenAPI document must describe
 * every public identifier in the Inventory/Product/Purchasing/Pricing domain
 * as a ULID string, never as the internal numeric primary key — and must
 * NOT blindly flip a genuinely-numeric identifier (a model with no
 * public_id) to a string either.
 *
 * This regenerates the doc itself (rather than trusting an out-of-band
 * `l5-swagger:generate` to have already run) so it fails deterministically
 * regardless of test order or local dev-lab state.
 */
class OpenApiIdentifierContractTest extends TestCase
{
    /**
     * Response schemas whose `id` property is a model using HasPublicId +
     * SerializesPublicIdAsId — must always serialize as a ULID string.
     * Extend this list whenever a new Inventory/Product/Purchasing/Pricing
     * resource adopts public_id.
     *
     * @var list<string>
     */
    private const PUBLIC_ID_RESPONSE_SCHEMAS = [
        'ProductResponse',
        'VariantResponse',
        'ItemResponse',
        'ItemVariantResponse',
        'UnitOfMeasureResponse',
        'VariantPurchasePresentationResponse',
    ];

    /**
     * Foreign-key properties within a named response schema that must also
     * be ULID strings, not just the schema's own top-level `id` — a schema
     * could keep `id` correct while a sibling FK property regresses back to
     * an integer without this failing.
     *
     * @var array<string, list<string>>
     */
    private const PUBLIC_ID_RESPONSE_SCHEMA_FK_PROPERTIES = [
        'ItemVariantResponse' => ['item_id', 'uom_id'],
        'VariantResponse' => ['item_id'],
        'VariantPurchasePresentationResponse' => ['item_variant_id'],
        'UomConversionResponse' => ['from_uom_id', 'to_uom_id'],
    ];

    /**
     * Request-body schemas with a public-ID property this issue corrected —
     * covers the request side, since PUBLIC_ID_RESPONSE_SCHEMA_FK_PROPERTIES
     * only checks response schemas. Reverting a request property back to
     * integer would otherwise regress request validation/generated-client
     * types undetected.
     *
     * @var array<string, list<string>>
     */
    private const PUBLIC_ID_REQUEST_SCHEMAS = [
        'CreateUomConversionRequest' => ['from_uom_id', 'to_uom_id'],
    ];

    /**
     * Path parameters that must be documented as ULID strings — the routes
     * this issue's audit corrected. Keyed by "METHOD path" -> param name.
     *
     * @var array<string, list<string>>
     */
    private const PUBLIC_ID_PATH_PARAMS = [
        'GET /api/v1/inventory/products/{id}' => ['id'],
        'PUT /api/v1/inventory/products/{id}' => ['id'],
        'DELETE /api/v1/inventory/products/{id}' => ['id'],
        'GET /api/v1/inventory/products/{id}/variants/{variantId}' => ['id', 'variantId'],
        'PUT /api/v1/inventory/products/{id}/variants/{variantId}' => ['id', 'variantId'],
        'DELETE /api/v1/inventory/products/{id}/variants/{variantId}' => ['id', 'variantId'],
        'POST /api/v1/inventory/products/{id}/variants' => ['id'],
        'GET /api/v1/inventory/products/{id}/variants/{variantId}/purchase-presentations/{presentationId}' => ['id', 'variantId', 'presentationId'],
        'PUT /api/v1/inventory/products/{id}/variants/{variantId}/purchase-presentations/{presentationId}' => ['id', 'variantId', 'presentationId'],
        'DELETE /api/v1/inventory/products/{id}/variants/{variantId}/purchase-presentations/{presentationId}' => ['id', 'variantId', 'presentationId'],
        'POST /api/v1/inventory/products/{id}/variants/{variantId}/purchase-presentations' => ['id', 'variantId'],
        'GET /api/v1/inventory-locations/{id}' => ['id'],
        'PUT /api/v1/inventory-locations/{id}' => ['id'],
        'DELETE /api/v1/inventory-locations/{id}' => ['id'],
        'GET /api/v1/items/{id}' => ['id'],
        'PUT /api/v1/items/{id}' => ['id'],
        'DELETE /api/v1/items/{id}' => ['id'],
        'GET /api/v1/item-variants/{id}' => ['id'],
        'PUT /api/v1/item-variants/{id}' => ['id'],
        'DELETE /api/v1/item-variants/{id}' => ['id'],
        'GET /api/v1/units-of-measure/{id}' => ['id'],
        'PUT /api/v1/units-of-measure/{id}' => ['id'],
        'DELETE /api/v1/units-of-measure/{id}' => ['id'],
    ];

    /**
     * Query filter parameters that reference one of the models above by
     * public_id — must never regress to accepting/documenting a raw
     * numeric FK.
     *
     * @var array<string, list<string>>
     */
    private const PUBLIC_ID_QUERY_PARAMS = [
        'GET /api/v1/item-variants' => ['item_id'],
        'GET /api/v1/uom-conversions' => ['from_uom_id', 'to_uom_id'],
    ];

    /**
     * The deliberate exception: UomConversion has no public_id of its own
     * (#581's audit confirmed it was never migrated by #399) — its `id`
     * must stay the internal numeric primary key. Guards against a future
     * blind find-and-replace "fixing" it incorrectly.
     */
    private const NUMERIC_ONLY_RESPONSE_SCHEMAS = [
        'UomConversionResponse',
    ];

    private const NUMERIC_ONLY_PATH_PARAMS = [
        'DELETE /api/v1/uom-conversions/{id}' => ['id'],
    ];

    /**
     * Endpoints that document their response inline (PHP attributes, e.g.
     * RegisterStockOutController) rather than via a reusable named schema —
     * grep-based and named-schema audits both miss these, so they need their
     * own explicit list. Each path is a dotted walk from the response body's
     * `data` object; `[]` on a segment descends into an array's `items`.
     *
     * @var array<string, list<string>>
     */
    private const PUBLIC_ID_INLINE_RESPONSE_FIELDS = [
        'POST /api/v1/inventory/stock-out' => [
            'id',
            'from_location_id',
            'to_location_id',
            'item_variant_id',
            'lines[].id',
            'from_location.id',
            'item_variant.id',
            'item_variant.item.id',
        ],
        'POST /api/v1/inventory/opening-balance' => [
            'id',
            'inventory_location_id',
            'item_variant_id',
            'location.id',
            'variant.id',
        ],
    ];

    /** @var array<string, mixed>|null */
    private static ?array $document = null;

    protected function setUp(): void
    {
        parent::setUp();

        // Generated once per test-run process (the Laravel app isn't
        // bootstrapped yet in setUpBeforeClass(), so Artisan can't run
        // there) — every test method reads the same in-memory document.
        if (self::$document === null) {
            Artisan::call('l5-swagger:generate');

            $path = storage_path('api-docs/api-docs.json');
            self::$document = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        }
    }

    #[Test]
    public function every_public_id_response_schema_documents_its_id_as_a_ulid_string(): void
    {
        $schemas = self::$document['components']['schemas'];

        foreach (self::PUBLIC_ID_RESPONSE_SCHEMAS as $schemaName) {
            $this->assertArrayHasKey($schemaName, $schemas, "Schema {$schemaName} is missing from the generated OpenAPI document.");

            $idProperty = $schemas[$schemaName]['properties']['id'] ?? null;
            $this->assertNotNull($idProperty, "{$schemaName}.id is missing from the generated OpenAPI document.");
            $this->assertSame(
                'string',
                $idProperty['type'] ?? null,
                "{$schemaName}.id must be documented as a ULID string (public_id), not \"{$idProperty['type']}\"."
            );
        }
    }

    #[Test]
    public function every_public_id_path_parameter_is_documented_as_a_string(): void
    {
        $paths = self::$document['paths'];

        foreach (self::PUBLIC_ID_PATH_PARAMS as $key => $paramNames) {
            [$method, $path] = explode(' ', $key, 2);
            $operation = $paths[$path][strtolower($method)] ?? null;
            $this->assertNotNull($operation, "{$key} is missing from the generated OpenAPI document.");

            $byName = collect($operation['parameters'] ?? [])->keyBy('name');

            foreach ($paramNames as $paramName) {
                $param = $byName->get($paramName);
                $this->assertNotNull($param, "{$key} is missing its \"{$paramName}\" parameter.");
                $this->assertSame(
                    'string',
                    $param['schema']['type'] ?? null,
                    "{$key}'s \"{$paramName}\" parameter must be documented as a ULID string, not \"{$param['schema']['type']}\"."
                );
            }
        }
    }

    #[Test]
    public function every_public_id_query_filter_is_documented_as_a_string(): void
    {
        $paths = self::$document['paths'];

        foreach (self::PUBLIC_ID_QUERY_PARAMS as $key => $paramNames) {
            [$method, $path] = explode(' ', $key, 2);
            $operation = $paths[$path][strtolower($method)] ?? null;
            $this->assertNotNull($operation, "{$key} is missing from the generated OpenAPI document.");

            $byName = collect($operation['parameters'] ?? [])->keyBy('name');

            foreach ($paramNames as $paramName) {
                $param = $byName->get($paramName);
                $this->assertNotNull($param, "{$key} is missing its \"{$paramName}\" query parameter.");
                $this->assertSame(
                    'string',
                    $param['schema']['type'] ?? null,
                    "{$key}'s \"{$paramName}\" query parameter must be documented as a ULID string, not \"{$param['schema']['type']}\"."
                );
            }
        }
    }

    #[Test]
    public function models_without_a_public_id_keep_their_numeric_id_documented(): void
    {
        $schemas = self::$document['components']['schemas'];

        foreach (self::NUMERIC_ONLY_RESPONSE_SCHEMAS as $schemaName) {
            $idProperty = $schemas[$schemaName]['properties']['id'] ?? null;
            $this->assertNotNull($idProperty, "{$schemaName}.id is missing from the generated OpenAPI document.");
            $this->assertSame(
                'integer',
                $idProperty['type'] ?? null,
                "{$schemaName}.id has no public_id counterpart and must stay documented as an integer — do not blindly convert every \"id\" field to a ULID string."
            );
        }

        $paths = self::$document['paths'];

        foreach (self::NUMERIC_ONLY_PATH_PARAMS as $key => $paramNames) {
            [$method, $path] = explode(' ', $key, 2);
            $operation = $paths[$path][strtolower($method)] ?? null;
            $this->assertNotNull($operation, "{$key} is missing from the generated OpenAPI document.");

            $byName = collect($operation['parameters'] ?? [])->keyBy('name');

            foreach ($paramNames as $paramName) {
                $param = $byName->get($paramName);
                $this->assertNotNull($param, "{$key} is missing its \"{$paramName}\" parameter.");
                $this->assertSame(
                    'integer',
                    $param['schema']['type'] ?? null,
                    "{$key}'s \"{$paramName}\" parameter has no public_id counterpart and must stay an integer."
                );
            }
        }
    }

    #[Test]
    public function every_public_id_response_schema_documents_its_foreign_keys_as_ulid_strings(): void
    {
        $schemas = self::$document['components']['schemas'];

        foreach (self::PUBLIC_ID_RESPONSE_SCHEMA_FK_PROPERTIES as $schemaName => $fkNames) {
            $this->assertArrayHasKey($schemaName, $schemas, "Schema {$schemaName} is missing from the generated OpenAPI document.");

            foreach ($fkNames as $fkName) {
                $fkProperty = $schemas[$schemaName]['properties'][$fkName] ?? null;
                $this->assertNotNull($fkProperty, "{$schemaName}.{$fkName} is missing from the generated OpenAPI document.");
                $this->assertSame(
                    'string',
                    $fkProperty['type'] ?? null,
                    "{$schemaName}.{$fkName} must be documented as a ULID string (public_id), not \"{$fkProperty['type']}\"."
                );
            }
        }
    }

    #[Test]
    public function every_public_id_request_property_is_documented_as_a_ulid_string(): void
    {
        $schemas = self::$document['components']['schemas'];

        foreach (self::PUBLIC_ID_REQUEST_SCHEMAS as $schemaName => $propertyNames) {
            $this->assertArrayHasKey($schemaName, $schemas, "Schema {$schemaName} is missing from the generated OpenAPI document.");

            foreach ($propertyNames as $propertyName) {
                $property = $schemas[$schemaName]['properties'][$propertyName] ?? null;
                $this->assertNotNull($property, "{$schemaName}.{$propertyName} is missing from the generated OpenAPI document.");
                $this->assertSame(
                    'string',
                    $property['type'] ?? null,
                    "{$schemaName}.{$propertyName} must be documented as a ULID string (public_id), not \"{$property['type']}\"."
                );
            }
        }
    }

    #[Test]
    public function every_inline_response_identifier_is_documented_as_a_ulid_string(): void
    {
        $paths = self::$document['paths'];

        foreach (self::PUBLIC_ID_INLINE_RESPONSE_FIELDS as $key => $dottedPaths) {
            [$method, $path] = explode(' ', $key, 2);
            $operation = $paths[$path][strtolower($method)] ?? null;
            $this->assertNotNull($operation, "{$key} is missing from the generated OpenAPI document.");

            $successResponse = collect($operation['responses'] ?? [])->first(fn ($response, $status) => (int) $status >= 200 && (int) $status < 300);
            $this->assertNotNull($successResponse, "{$key} has no 2xx response documented.");

            $dataProperties = $successResponse['content']['application/json']['schema']['properties']['data']['properties'] ?? null;
            $this->assertNotNull($dataProperties, "{$key}'s success response has no \"data\" object to inspect.");

            foreach ($dottedPaths as $dottedPath) {
                $resolved = $this->resolveInlineSchemaProperty($dataProperties, $dottedPath);
                $this->assertNotNull($resolved, "{$key}'s response is missing \"data.{$dottedPath}\".");
                $this->assertSame(
                    'string',
                    $resolved['type'] ?? null,
                    "{$key}'s \"data.{$dottedPath}\" must be documented as a ULID string, not \"{$resolved['type']}\"."
                );
            }
        }
    }

    /**
     * Walks a dotted path through an inline OpenAPI response schema's
     * `properties` tree. A segment suffixed with `[]` descends into an
     * array property's `items` before continuing.
     *
     * @param  array<string, mixed>  $properties
     * @return array<string, mixed>|null
     */
    private function resolveInlineSchemaProperty(array $properties, string $dottedPath): ?array
    {
        $current = ['properties' => $properties];

        foreach (explode('.', $dottedPath) as $segment) {
            $isArray = str_ends_with($segment, '[]');
            $key = rtrim($segment, '[]');

            $node = $current['properties'][$key] ?? null;
            if ($node === null) {
                return null;
            }

            $current = $isArray ? ($node['items'] ?? null) : $node;
            if ($current === null) {
                return null;
            }
        }

        return $current;
    }
}
