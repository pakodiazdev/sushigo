<?php

declare(strict_types=1);

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *   schema="ReceiptResponse",
 *   title="Receipt Response",
 *   required={"id", "status", "receipt_date", "lines"},
 *
 *   @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Public ULID"),
 *   @OA\Property(property="status", type="string", enum={"DRAFT", "POSTED", "REVERSED"}),
 *   @OA\Property(property="reference", type="string", nullable=true, example="FAC-2026-0001"),
 *   @OA\Property(property="receipt_date", type="string", format="date"),
 *   @OA\Property(property="notes", type="string", nullable=true),
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
 *     description="Receiving Location context (#572): type, receiving capability, active flag and owning Operating Unit",
 *     @OA\Property(property="id", type="string"),
 *     @OA\Property(property="name", type="string"),
 *     @OA\Property(property="type", type="string", example="MAIN"),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="can_receive_purchases", type="boolean"),
 *     @OA\Property(
 *       property="operating_unit",
 *       type="object",
 *       nullable=true,
 *       @OA\Property(property="id", type="integer"),
 *       @OA\Property(property="name", type="string"),
 *       @OA\Property(property="type", type="string")
 *     )
 *   ),
 *   @OA\Property(
 *     property="lines",
 *     type="array",
 *
 *     @OA\Items(
 *       required={"id", "received_packages", "presentation_factor", "base_units_received", "effective_unit_cost"},
 *
 *       @OA\Property(property="id", type="integer", example=1),
 *       @OA\Property(property="variant_purchase_presentation_id", type="string", nullable=true),
 *       @OA\Property(
 *         property="variant",
 *         type="object",
 *         nullable=true,
 *         @OA\Property(property="id", type="string"),
 *         @OA\Property(property="code", type="string"),
 *         @OA\Property(property="name", type="string")
 *       ),
 *       @OA\Property(property="supplier_offering_id", type="string", nullable=true),
 *       @OA\Property(property="ordered_packages", type="number", format="float", example=10),
 *       @OA\Property(property="received_packages", type="number", format="float", example=10),
 *       @OA\Property(property="bonus_packages", type="number", format="float", example=0),
 *       @OA\Property(property="presentation_factor", type="number", format="float", example=24, description="Snapshotted package->base-unit factor"),
 *       @OA\Property(property="gross_amount", type="number", format="float", example=4800),
 *       @OA\Property(property="discounts", type="number", format="float", example=0),
 *       @OA\Property(property="allocated_expenses", type="number", format="float", example=150),
 *       @OA\Property(property="non_recoverable_taxes", type="number", format="float", example=0),
 *       @OA\Property(property="net_acquisition_amount", type="number", format="float", example=4950),
 *       @OA\Property(property="base_units_received", type="number", format="float", example=240),
 *       @OA\Property(property="effective_unit_cost", type="number", format="float", example=20.625)
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
final class ReceiptResponse
{
    // Documentation-only schema. Runtime serialization lives in ReceiptResource/ReceiptLineResource.
}
