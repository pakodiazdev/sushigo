<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Inventory\RegisterStockOutRequest;
use App\Services\Inventory\StockOutService;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

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
            description: 'Stock out movement registered successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(
                        property: 'data',
                        properties: [
                            new OA\Property(property: 'id', type: 'integer', example: 1),
                            new OA\Property(property: 'from_location_id', type: 'integer', example: 1),
                            new OA\Property(property: 'to_location_id', type: 'integer', nullable: true, example: null),
                            new OA\Property(property: 'item_variant_id', type: 'integer', example: 1),
                            new OA\Property(property: 'user_id', type: 'integer', nullable: true, example: 1),
                            new OA\Property(property: 'qty', type: 'number', format: 'decimal', example: '10.0000'),
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
                                        new OA\Property(property: 'id', type: 'integer', example: 1),
                                        new OA\Property(property: 'qty', type: 'number', example: '10.0000'),
                                        new OA\Property(property: 'base_qty', type: 'number', example: '10.0000'),
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
                                    new OA\Property(property: 'id', type: 'integer', example: 1),
                                    new OA\Property(property: 'name', type: 'string', example: 'Main Warehouse'),
                                ],
                                type: 'object'
                            ),
                            new OA\Property(
                                property: 'item_variant',
                                properties: [
                                    new OA\Property(property: 'id', type: 'integer', example: 1),
                                    new OA\Property(property: 'sku', type: 'string', example: 'VAR-001'),
                                    new OA\Property(property: 'name', type: 'string', example: 'Rice - 1kg'),
                                    new OA\Property(
                                        property: 'item',
                                        properties: [
                                            new OA\Property(property: 'id', type: 'integer', example: 1),
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
                    new OA\Property(property: 'message', type: 'string', example: 'Stock out movement registered successfully'),
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
            $movement = $this->stockOutService->registerStockOut(
                inventoryLocationId: $request->input('inventory_location_id'),
                itemVariantId: $request->input('item_variant_id'),
                quantity: $request->input('qty'),
                transactionUomId: $request->input('uom_id'),
                reason: $request->input('reason'),
                salePrice: $request->input('sale_price'),
                userId: $request->user()?->id,
                reference: $request->input('reference'),
                notes: $request->input('notes')
            );

            return response()->json([
                'success' => true,
                'data' => $movement,
                'message' => 'Stock out movement registered successfully',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
