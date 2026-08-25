<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Supplier;

use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreSupplierRequest",
 *   required={"code", "name"},
 *
 *   @OA\Property(property="code", type="string", maxLength=50, example="MAR-NORTE"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Mar del Norte SA"),
 *   @OA\Property(property="contact_name", type="string", maxLength=255, nullable=true, example="Ana López"),
 *   @OA\Property(property="email", type="string", format="email", maxLength=255, nullable=true, example="compras@mardelnorte.mx"),
 *   @OA\Property(property="phone", type="string", maxLength=50, nullable=true, example="+52 55 1234 5678"),
 *   @OA\Property(property="is_active", type="boolean", default=true)
 * )
 */
class StoreSupplierRequest extends SupplierRequest
{
    /**
     * Shared with CreateSupplierController, which surfaces the same message when the
     * Rule::unique pre-check below loses a TOCTOU race against the database's unique index.
     */
    public const DUPLICATE_CODE_MESSAGE = 'Ya existe un proveedor con este código.';

    public function rules(): array
    {
        return $this->supplierRules(
            ['required', 'string', 'max:50', Rule::unique('suppliers', 'code')->whereNull('deleted_at')],
            'required',
            'nullable',
        );
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            ...$this->supplierMessages(['code.required', 'name.required']),
        ];
    }

    /** @return array<string, mixed> */
    public function supplierData(): array
    {
        $data = $this->validated();
        $data['is_active'] ??= true;

        return $data;
    }
}
