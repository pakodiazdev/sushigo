<?php

declare(strict_types=1);

namespace App\Http\Requests\Pricing\PriceListAssignments;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\PriceList;
use App\Models\PriceListAssignment;
use App\Policies\Concerns\ChecksBranchAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StorePriceListAssignmentRequest",
 *   required={"price_list_id", "branch_id", "effective_from"},
 *
 *   @OA\Property(property="price_list_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD", description="Price List public ID"),
 *   @OA\Property(property="branch_id", type="integer", example=1),
 *   @OA\Property(property="operating_unit_id", type="integer", nullable=true, example=1, description="More specific override within the branch"),
 *   @OA\Property(property="effective_from", type="string", format="date", example="2026-01-01"),
 *   @OA\Property(property="effective_to", type="string", format="date", nullable=true, example="2026-12-31"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 * )
 */
class StorePriceListAssignmentRequest extends FormRequest
{
    use ChecksBranchAccess;
    use ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        if (! $this->user()->can('create', PriceListAssignment::class)) {
            return false;
        }

        $branchId = $this->input('branch_id');

        if (! is_numeric($branchId)) {
            // Let rules() reject a missing/non-numeric branch_id with a normal 422.
            return true;
        }

        return $this->userHasBranchAccess($this->user(), (int) $branchId);
    }

    public function rules(): array
    {
        return [
            // Table-based exists: rules ignore SoftDeletes, but resolvePublicId()
            // below resolves through the PriceList Eloquent model, which excludes
            // soft-deleted rows by default — without this scope, a soft-deleted
            // public_id would pass validation, resolve to a null id, and crash
            // the service with a TypeError instead of a normal 422.
            'price_list_id' => ['required', 'string', Rule::exists('price_lists', 'public_id')->where(fn ($query) => $query->whereNull('deleted_at'))],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'operating_unit_id' => ['nullable', 'integer', 'exists:operating_units,id'],
            'effective_from' => ['required', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function assignmentData(): array
    {
        $data = $this->validated();
        $data['price_list_id'] = $this->resolvePublicId(PriceList::class, 'price_list_id');
        $data['is_active'] ??= true;

        return $data;
    }
}
