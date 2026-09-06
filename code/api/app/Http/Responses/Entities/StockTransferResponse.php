<?php

declare(strict_types=1);

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *   schema="StockTransferResponse",
 *   title="Stock Transfer Response",
 *   required={"id", "status", "transfer_date", "lines"},
 *
 *   @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Public ULID"),
 *   @OA\Property(property="status", type="string", enum={"DRAFT", "POSTED", "REVERSED"}),
 *   @OA\Property(property="reference", type="string", nullable=true, example="TR-2026-0001"),
 *   @OA\Property(property="transfer_date", type="string", format="date"),
 *   @OA\Property(property="notes", type="string", nullable=true),
 *   @OA\Property(
 *     property="source_location",
 *     type="object",
 *     nullable=true,
 *     @OA\Property(property="id", type="string"),
 *     @OA\Property(property="name", type="string")
 *   ),
 *   @OA\Property(
 *     property="destination_location",
 *     type="object",
 *     nullable=true,
 *     @OA\Property(property="id", type="string"),
 *     @OA\Property(property="name", type="string")
 *   ),
 *   @OA\Property(
 *     property="lines",
 *     type="array",
 *
 *     @OA\Items(
 *       required={"id", "entry_quantity", "conversion_factor", "base_quantity"},
 *
 *       @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *       @OA\Property(
 *         property="variant",
 *         type="object",
 *         nullable=true,
 *         @OA\Property(property="id", type="string"),
 *         @OA\Property(property="code", type="string"),
 *         @OA\Property(property="name", type="string")
 *       ),
 *       @OA\Property(
 *         property="entry_uom",
 *         type="object",
 *         nullable=true,
 *         @OA\Property(property="id", type="string"),
 *         @OA\Property(property="code", type="string"),
 *         @OA\Property(property="symbol", type="string")
 *       ),
 *       @OA\Property(property="entry_quantity", type="number", format="float", example=12),
 *       @OA\Property(property="conversion_factor", type="number", format="float", example=1),
 *       @OA\Property(property="base_quantity", type="number", format="float", example=12),
 *       @OA\Property(property="source_unit_cost", type="number", format="float", nullable=true, example=20.5, description="Source weighted-average cost snapshot, set at posting")
 *     )
 *   ),
 *   @OA\Property(property="posted_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(
 *     property="posted_by",
 *     type="object",
 *     nullable=true,
 *     @OA\Property(property="id", type="integer"),
 *     @OA\Property(property="name", type="string")
 *   ),
 *   @OA\Property(property="reversed_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(
 *     property="reversed_by",
 *     type="object",
 *     nullable=true,
 *     @OA\Property(property="id", type="integer"),
 *     @OA\Property(property="name", type="string")
 *   ),
 *   @OA\Property(property="reversal_reason", type="string", nullable=true),
 *   @OA\Property(property="created_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(property="updated_at", type="string", format="date-time", nullable=true)
 * )
 */
final class StockTransferResponse
{
    // Documentation-only schema. Runtime serialization lives in StockTransferResource/StockTransferLineResource.
}
