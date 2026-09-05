<?php

declare(strict_types=1);

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *   schema="StockMovementResponse",
 *   title="Stock Movement Response",
 *   description="Full immutable audit evidence for one Stock Movement, returned by GET /inventory/movements/{id}.",
 *   allOf={
 *     @OA\Schema(ref="#/components/schemas/StockMovementSummaryResponse"),
 *     @OA\Schema(
 *
 *       @OA\Property(property="notes", type="string", nullable=true),
 *       @OA\Property(
 *         property="reverses",
 *         type="object",
 *         nullable=true,
 *         description="The posted movement this row compensates (set only on a reversal)",
 *         @OA\Property(property="id", type="string"),
 *         @OA\Property(property="reason", type="string"),
 *         @OA\Property(property="status", type="string"),
 *         @OA\Property(property="posted_at", type="string", format="date-time", nullable=true)
 *       ),
 *       @OA\Property(
 *         property="reversed_by",
 *         type="object",
 *         nullable=true,
 *         description="The compensating movement that reversed this one, if any",
 *         @OA\Property(property="id", type="string"),
 *         @OA\Property(property="reason", type="string"),
 *         @OA\Property(property="status", type="string"),
 *         @OA\Property(property="posted_at", type="string", format="date-time", nullable=true)
 *       ),
 *       @OA\Property(property="reversed_at", type="string", format="date-time", nullable=true),
 *       @OA\Property(property="reversal_reason", type="string", nullable=true)
 *     )
 *   }
 * )
 */
final class StockMovementResponse
{
    // Documentation-only schema. Runtime serialization lives in StockMovementResource.
}
