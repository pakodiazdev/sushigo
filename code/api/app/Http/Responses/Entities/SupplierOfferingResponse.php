<?php

declare(strict_types=1);

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *   schema="SupplierOfferingResponse",
 *   title="Supplier Offering Response",
 *   required={"id", "supplier", "presentation", "quoted_price", "currency", "minimum_order_quantity", "is_active"},
 *
 *   @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Public ULID"),
 *   @OA\Property(
 *     property="supplier",
 *     type="object",
 *     required={"id", "code", "name"},
 *     @OA\Property(property="id", type="string", description="Supplier public_id (ULID)"),
 *     @OA\Property(property="code", type="string", example="MAR-NORTE"),
 *     @OA\Property(property="name", type="string", example="Mar del Norte SA")
 *   ),
 *   @OA\Property(
 *     property="presentation",
 *     type="object",
 *     required={"id"},
 *     @OA\Property(property="id", type="string", description="Variant Purchase Presentation public_id (ULID)"),
 *     @OA\Property(property="package_barcode", type="string", nullable=true),
 *     @OA\Property(
 *       property="template",
 *       type="object",
 *       nullable=true,
 *       @OA\Property(property="id", type="string"),
 *       @OA\Property(property="code", type="string"),
 *       @OA\Property(property="name", type="string"),
 *       @OA\Property(property="package_type", type="string", enum={"UNIT", "PACK", "BOX", "TRAY"}),
 *       @OA\Property(property="base_unit_quantity", type="number", format="float")
 *     ),
 *     @OA\Property(
 *       property="variant",
 *       type="object",
 *       nullable=true,
 *       @OA\Property(property="id", type="string"),
 *       @OA\Property(property="code", type="string"),
 *       @OA\Property(property="name", type="string"),
 *       @OA\Property(
 *         property="product",
 *         type="object",
 *         nullable=true,
 *         @OA\Property(property="id", type="string"),
 *         @OA\Property(property="name", type="string")
 *       )
 *     )
 *   ),
 *   @OA\Property(property="supplier_code", type="string", nullable=true, example="ARROZ-20KG"),
 *   @OA\Property(property="quoted_price", type="number", format="float", example=480, description="Reference quotation; never the posted acquisition cost"),
 *   @OA\Property(property="currency", type="string", example="MXN"),
 *   @OA\Property(property="valid_from", type="string", format="date", nullable=true),
 *   @OA\Property(property="valid_until", type="string", format="date", nullable=true),
 *   @OA\Property(property="minimum_order_quantity", type="number", format="float", example=5),
 *   @OA\Property(property="lead_time_days", type="integer", nullable=true, example=3),
 *   @OA\Property(property="is_active", type="boolean"),
 *   @OA\Property(property="created_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(property="updated_at", type="string", format="date-time", nullable=true)
 * )
 */
final class SupplierOfferingResponse
{
    // Documentation-only schema. Runtime serialization lives in SupplierOfferingResource.
}
