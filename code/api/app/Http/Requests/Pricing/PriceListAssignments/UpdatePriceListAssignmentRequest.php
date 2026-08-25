<?php

declare(strict_types=1);

namespace App\Http\Requests\Pricing\PriceListAssignments;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\PriceList;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * branch_id is intentionally not editable here — reassigning a
 * PriceListAssignment to a different Branch is a new authorization decision
 * (does the user have access to the new branch?), not an update of an
 * existing one; delete and recreate instead. Mirrors CashRegister's own
 * UpdateRequest, which likewise omits branch_id.
 *
 * @OA\Schema(
 *   schema="UpdatePriceListAssignmentRequest",
 *
 *   @OA\Property(property="price_list_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD"),
 *   @OA\Property(property="operating_unit_id", type="integer", nullable=true, example=1),
 *   @OA\Property(property="effective_from", type="string", format="date", example="2026-01-01"),
 *   @OA\Property(property="effective_to", type="string", format="date", nullable=true, example="2026-12-31"),
 *   @OA\Property(property="is_active", type="boolean", example=true),
 * )
 */
class UpdatePriceListAssignmentRequest extends FormRequest
{
    use ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('priceListAssignment'));
    }

    public function rules(): array
    {
        return [
            // Same soft-delete gap as StorePriceListAssignmentRequest — see its rules().
            'price_list_id' => ['sometimes', 'string', Rule::exists('price_lists', 'public_id')->where(fn ($query) => $query->whereNull('deleted_at'))],
            'operating_unit_id' => ['nullable', 'integer', 'exists:operating_units,id'],
            'effective_from' => ['sometimes', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * `effective_to`'s `after_or_equal:effective_from` rule only compares
     * against effective_from *in this request's payload* — a request that
     * sends only effective_from, later than the row's already-stored
     * effective_to, passes that rule untouched and would otherwise reach
     * the service with an invalid resulting range, tripping the
     * chk_pla_effective_range DB constraint as an uncaught 500 instead of a
     * normal 422. This cross-checks the range the write will actually
     * produce, falling back to the stored value for whichever bound is
     * absent from the request — mirroring how PriceListAssignmentService
     * itself computes the post-write effective_from/effective_to.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->hasAny(['effective_from', 'effective_to'])) {
                return;
            }

            $assignment = $this->route('priceListAssignment');

            $effectiveFrom = $this->input('effective_from') ?? $assignment->effective_from->toDateString();
            $effectiveTo = $this->has('effective_to') ? $this->input('effective_to') : $assignment->effective_to?->toDateString();

            // Comparing raw strings only works for ISO 'Y-m-d' input — the
            // 'date' rule above accepts any format PHP's parser understands
            // (e.g. '08/01/2026'), which doesn't sort lexically the same way
            // it compares chronologically. Parse both before comparing.
            if ($effectiveTo !== null && Carbon::parse($effectiveTo)->lt(Carbon::parse($effectiveFrom))) {
                $validator->errors()->add('effective_to', 'effective_to debe ser posterior o igual a effective_from.');
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function assignmentData(): array
    {
        $data = $this->validated();

        if (array_key_exists('price_list_id', $data)) {
            $data['price_list_id'] = $this->resolvePublicId(PriceList::class, 'price_list_id');
        }

        return $data;
    }
}
