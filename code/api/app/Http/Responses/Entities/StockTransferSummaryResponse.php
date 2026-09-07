<?php

declare(strict_types=1);

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *   schema="StockTransferSummaryResponse",
 *   title="Stock Transfer Summary Response",
 *   description="Bounded history row from GET /inventory/transfers. Omits the lines array — full evidence is fetched from the detail endpoint.",
 *   required={"id", "status", "transfer_date", "line_count"},
 *
 *   @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Public ULID"),
 *   @OA\Property(property="status", type="string", enum={"DRAFT", "POSTED", "REVERSED"}),
 *   @OA\Property(property="reference", type="string", nullable=true),
 *   @OA\Property(property="transfer_date", type="string", format="date"),
 *   @OA\Property(property="notes", type="string", nullable=true),
 *   @OA\Property(property="line_count", type="integer", example=3),
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
 *   @OA\Property(property="posted_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(property="reversed_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(property="created_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(property="updated_at", type="string", format="date-time", nullable=true)
 * )
 */
final class StockTransferSummaryResponse
{
    // Documentation-only schema. Runtime serialization lives in StockTransferSummaryResource.
}
