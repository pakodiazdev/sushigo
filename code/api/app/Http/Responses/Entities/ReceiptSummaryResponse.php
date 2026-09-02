<?php

declare(strict_types=1);

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *   schema="ReceiptSummaryResponse",
 *   title="Receipt Summary Response",
 *   description="Bounded history row returned by GET /inventory/receipts. Omits line evidence — fetch the full Receipt (with lines) from GET /inventory/receipts/{id}.",
 *   required={"id", "status", "receipt_date", "total"},
 *
 *   @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Public ULID"),
 *   @OA\Property(property="status", type="string", enum={"DRAFT", "POSTED", "REVERSED"}),
 *   @OA\Property(property="reference", type="string", nullable=true, example="FAC-2026-0001"),
 *   @OA\Property(property="receipt_date", type="string", format="date"),
 *   @OA\Property(property="notes", type="string", nullable=true),
 *   @OA\Property(property="total", type="number", format="float", example=4950, description="Sum of the receipt's line net_acquisition_amount, aggregated in SQL"),
 *   @OA\Property(
 *     property="supplier",
 *     type="object",
 *     nullable=true,
 *     @OA\Property(property="id", type="string"),
 *     @OA\Property(property="code", type="string"),
 *     @OA\Property(property="name", type="string")
 *   ),
 *   @OA\Property(
 *     property="destination_location",
 *     type="object",
 *     nullable=true,
 *     @OA\Property(property="id", type="string"),
 *     @OA\Property(property="name", type="string")
 *   ),
 *   @OA\Property(property="posted_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(property="reversed_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(property="created_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(property="updated_at", type="string", format="date-time", nullable=true)
 * )
 */
final class ReceiptSummaryResponse
{
    // Documentation-only schema. Runtime serialization lives in ReceiptSummaryResource.
}
