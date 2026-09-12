<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\DataTransferObjects\Inventory\RegisterStockOutData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Inventory\RegisterStockOutRequest;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use App\Services\Inventory\StockOutService;
use Exception;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

// Shared with the OA attribute below and the controller body — attribute arguments
// must be constant expressions, and the OA\Post attribute decorates the class
// itself, so these live as namespaced constants rather than class constants.
const STOCK_OUT_SUCCESS_MESSAGE = 'Stock out movement registered successfully';
const STOCK_OUT_EXAMPLE_QTY = '10.0000';
const STOCK_OUT_LOCATION_ULID_DESCRIPTION = 'Inventory Location public_id (ULID)';

#[OA\Post(
    path: '/api/v1/inventory/stock-out',
    summary: 'Register a stock outbound movement (sale or consumption)',
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(ref: '#/components/schemas/RegisterStockOutRequest')
    ),
    tags: ['Inventory'],
    responses: [
        new OA\Response(
            response: 201,
            description: STOCK_OUT_SUCCESS_MESSAGE,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(
                        property: 'data',
                        properties: [
                            new OA\Property(property: 'id', type: 'string', example: '01JKMOV1234567890ABCDEFGH', description: 'Stock movement public_id (ULID)'),
                            new OA\Property(property: 'from_location_id', type: 'string', example: '01JKLOC1234567890ABCDEFGH', description: STOCK_OUT_LOCATION_ULID_DESCRIPTION),
                            new OA\Property(property: 'to_location_id', type: 'string', nullable: true, example: null, description: STOCK_OUT_LOCATION_ULID_DESCRIPTION),
                            new OA\Property(property: 'item_variant_id', type: 'string', example: '01JKVAR1234567890ABCDEFGH', description: 'Item Variant public_id (ULID)'),
                            new OA\Property(property: 'user_id', type: 'integer', nullable: true, example: 1, description: 'User has no public_id — internal numeric id'),
                            new OA\Property(property: 'qty', type: 'number', format: 'decimal', example: STOCK_OUT_EXAMPLE_QTY),
                            new OA\Property(property: 'reason', type: 'string', example: 'SALE'),
                            new OA\Property(property: 'status', type: 'string', example: 'POSTED'),
                            new OA\Property(property: 'reference', type: 'string', nullable: true, example: 'SALE-001'),
                            new OA\Property(property: 'notes', type: 'string', nullable: true),
                            new OA\Property(
                                property: 'meta',
                                properties: [
                                    new OA\Property(property: 'original_qty', type: 'number', example: 10),
                                    new OA\Property(property: 'original_uom', type: 'string', example: 'KG'),
                                    new OA\Property(property: 'unit_cost', type: 'number', example: 50.00),
                                    new OA\Property(property: 'sale_price', type: 'number', example: 75.00),
                                    new OA\Property(property: 'profit_margin', type: 'number', example: 25.00),
                                ],
                                type: 'object'
                            ),
                            new OA\Property(property: 'posted_at', type: 'string', format: 'date-time'),
                            new OA\Property(
                                property: 'lines',
                                type: 'array',
                                items: new OA\Items(
                                    properties: [
                                        new OA\Property(property: 'id', type: 'string', example: '01JKLIN1234567890ABCDEFGH', description: 'Stock movement line public_id (ULID)'),
                                        new OA\Property(property: 'qty', type: 'number', example: STOCK_OUT_EXAMPLE_QTY),
                                        new OA\Property(property: 'unit_cost', type: 'number', example: '50.0000'),
                                        new OA\Property(property: 'line_total', type: 'number', example: '500.0000'),
                                        new OA\Property(property: 'sale_price', type: 'number', example: '75.0000'),
                                        new OA\Property(property: 'sale_total', type: 'number', example: '750.0000'),
                                        new OA\Property(property: 'profit_margin', type: 'number', example: '25.0000'),
                                        new OA\Property(property: 'profit_total', type: 'number', example: '250.0000'),
                                    ],
                                    type: 'object'
                                )
                            ),
                            new OA\Property(
                                property: 'from_location',
                                properties: [
                                    new OA\Property(property: 'id', type: 'string', example: '01JKLOC1234567890ABCDEFGH', description: STOCK_OUT_LOCATION_ULID_DESCRIPTION),
                                    new OA\Property(property: 'name', type: 'string', example: 'Main Warehouse'),
                                ],
                                type: 'object'
                            ),
                            new OA\Property(
                                property: 'item_variant',
                                properties: [
                                    new OA\Property(property: 'id', type: 'string', example: '01JKVAR1234567890ABCDEFGH', description: 'Item Variant public_id (ULID)'),
                                    new OA\Property(property: 'sku', type: 'string', example: 'VAR-001'),
                                    new OA\Property(property: 'name', type: 'string', example: 'Rice - 1kg'),
                                    new OA\Property(
                                        property: 'item',
                                        properties: [
                                            new OA\Property(property: 'id', type: 'string', example: '01JKITM1234567890ABCDEFGH', description: 'Item public_id (ULID)'),
                                            new OA\Property(property: 'name', type: 'string', example: 'Rice'),
                                        ],
                                        type: 'object'
                                    ),
                                ],
                                type: 'object'
                            ),
                        ],
                        type: 'object'
                    ),
                    new OA\Property(property: 'message', type: 'string', example: STOCK_OUT_SUCCESS_MESSAGE),
                ],
                type: 'object'
            )
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: false),
                    new OA\Property(property: 'message', type: 'string', example: 'Validation failed'),
                    new OA\Property(
                        property: 'errors',
                        properties: [
                            new OA\Property(
                                property: 'qty',
                                type: 'array',
                                items: new OA\Items(type: 'string', example: 'The quantity is required.')
                            ),
                        ],
                        type: 'object'
                    ),
                ],
                type: 'object'
            )
        ),
        new OA\Response(
            response: 400,
            description: 'Insufficient stock or business logic error',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: false),
                    new OA\Property(property: 'message', type: 'string', example: 'Insufficient stock. Available: 5, Requested: 10'),
                ],
                type: 'object'
            )
        ),
    ]
)]
class RegisterStockOutController extends Controller
{
    public function __construct(
        protected StockOutService $stockOutService
    ) {}

    /**
     * Register a stock outbound movement (sale or consumption)
     */
    public function __invoke(RegisterStockOutRequest $request): JsonResponse
    {
        try {
            $movement = $this->stockOutService->registerStockOut(new RegisterStockOutData(
                inventoryLocationId: $request->inventoryLocationId(),
                itemVariantId: $request->itemVariantId(),
                quantity: $request->input('qty'),
                transactionUomId: $request->uomId(),
                reason: $request->input('reason'),
                salePrice: $request->input('sale_price'),
                userId: $request->user()?->id,
                reference: $request->input('reference'),
                notes: $request->input('notes')
            ));

            return response()->json([
                'success' => true,
                'data' => $this->formatMovement($movement),
                'message' => STOCK_OUT_SUCCESS_MESSAGE,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * SerializesPublicIdAsId only rewrites a model's own `id` — it doesn't
     * touch foreign-key columns, so from_location_id/to_location_id/
     * item_variant_id must be mapped to the loaded relations' public_id by
     * hand (#581). user_id stays numeric: User has no public_id.
     *
     * The single line and `meta.original_uom_id` also carry raw internal FKs
     * that were never part of the documented response contract (only the
     * movement-level id/from_location_id/to_location_id/item_variant_id and
     * each line's own qty/cost/total fields are documented) — dropped here
     * rather than translated, since nothing reads them back (#581).
     *
     * @return array<string, mixed>
     */
    private function formatMovement(StockMovement $movement): array
    {
        $array = $movement->toArray();
        $array['from_location_id'] = $movement->fromLocation?->public_id;
        $array['to_location_id'] = $movement->toLocation?->public_id;
        $array['item_variant_id'] = $movement->itemVariant?->public_id;
        unset($array['meta']['original_uom_id']);

        $array['lines'] = $movement->lines->map(function (StockMovementLine $line): array {
            $lineArray = $line->toArray();
            unset($lineArray['stock_movement_id'], $lineArray['item_variant_id'], $lineArray['uom_id']);

            return $lineArray;
        })->all();

        return $array;
    }
}
