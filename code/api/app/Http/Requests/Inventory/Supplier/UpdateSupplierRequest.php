<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Supplier;

use App\Models\Supplier;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateSupplierRequest",
 *
 *   @OA\Property(property="code", type="string", maxLength=50, example="MAR-NORTE"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Mar del Norte SA"),
 *   @OA\Property(property="contact_name", type="string", maxLength=255, nullable=true),
 *   @OA\Property(property="email", type="string", format="email", maxLength=255, nullable=true),
 *   @OA\Property(property="phone", type="string", maxLength=50, nullable=true),
 *   @OA\Property(property="is_active", type="boolean")
 * )
 */
class UpdateSupplierRequest extends SupplierRequest
{
    public function rules(): array
    {
        /** @var Supplier $supplier */
        $supplier = $this->route('supplier');

        return $this->supplierRules(
            ['sometimes', 'string', 'max:50', Rule::unique('suppliers', 'code')->ignore($supplier->id)->whereNull('deleted_at')],
            'sometimes',
            'sometimes',
        );
    }
}
