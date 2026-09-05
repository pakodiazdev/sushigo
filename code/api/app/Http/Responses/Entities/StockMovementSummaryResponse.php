<?php

declare(strict_types=1);

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *   schema="StockMovementSummaryResponse",
 *   title="Stock Movement Summary Response",
 *   description="Bounded ledger row returned by GET /inventory/movements. Omits notes and the reversal audit trail — fetch the full movement from GET /inventory/movements/{id}.",
 *   required={"id", "reason", "status", "direction", "is_reversal", "quantity"},
 *
 *   @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Public ULID"),
 *   @OA\Property(property="reason", type="string", enum={"TRANSFER","RETURN","SALE","ADJUSTMENT","CONSUMPTION","OPENING_BALANCE","COUNT_VARIANCE","PURCHASE_RECEIPT","PURCHASE_RECEIPT_REVERSAL"}),
 *   @OA\Property(property="status", type="string", enum={"DRAFT","POSTED","REVERSED"}),
 *   @OA\Property(property="direction", type="string", enum={"entry","exit","transfer","adjustment"}, description="Derived movement kind — never the removed legacy `type` column"),
 *   @OA\Property(property="is_reversal", type="boolean", description="True when this row is itself a compensating reversal of another movement"),
 *   @OA\Property(property="quantity", type="number", format="float", description="Quantity moved, in the variant's base UOM"),
 *   @OA\Property(property="reference", type="string", nullable=true),
 *   @OA\Property(property="from_location", type="object", nullable=true, @OA\Property(property="id", type="string"), @OA\Property(property="name", type="string")),
 *   @OA\Property(property="to_location", type="object", nullable=true, @OA\Property(property="id", type="string"), @OA\Property(property="name", type="string")),
 *   @OA\Property(
 *     property="variant",
 *     type="object",
 *     nullable=true,
 *     @OA\Property(property="id", type="string"),
 *     @OA\Property(property="code", type="string"),
 *     @OA\Property(property="name", type="string"),
 *     @OA\Property(property="base_uom", type="object", nullable=true, @OA\Property(property="id", type="string"), @OA\Property(property="code", type="string"), @OA\Property(property="name", type="string"), @OA\Property(property="symbol", type="string", nullable=true))
 *   ),
 *   @OA\Property(property="actor", type="object", nullable=true, @OA\Property(property="id", type="integer"), @OA\Property(property="name", type="string")),
 *   @OA\Property(
 *     property="source",
 *     type="object",
 *     nullable=true,
 *     description="Originating source document — null for manual movements. `type` is a stable token (never an internal FQCN); `id` is the source's public ULID (null if that record was hard-deleted).",
 *     @OA\Property(property="type", type="string", example="receipt"),
 *     @OA\Property(property="id", type="string", nullable=true, example="01JKXYZ1234567890ABCDEFGH")
 *   ),
 *   @OA\Property(property="posted_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(property="created_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(property="updated_at", type="string", format="date-time", nullable=true)
 * )
 */
final class StockMovementSummaryResponse
{
    // Documentation-only schema. Runtime serialization lives in StockMovementSummaryResource.
}
