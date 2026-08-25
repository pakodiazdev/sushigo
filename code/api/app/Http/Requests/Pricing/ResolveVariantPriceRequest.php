<?php

declare(strict_types=1);

namespace App\Http\Requests\Pricing;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\PriceList;
use App\Support\Clock\ApplicationClock;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class ResolveVariantPriceRequest extends FormRequest
{
    use ResolvesPublicIdReferences;

    public function __construct(private readonly ApplicationClock $clock)
    {
        parent::__construct();
    }

    public function authorize(): bool
    {
        return $this->user()->can('viewAny', PriceList::class);
    }

    public function rules(): array
    {
        return [
            // Same soft-delete gap as the other Pricing requests — the raw
            // table exists: rule ignores SoftDeletes, but resolveItemVariant()
            // resolves through the Eloquent model, which excludes trashed
            // rows and would otherwise 404 instead of returning a normal 422.
            'item_variant_id' => ['required', 'string', Rule::exists('item_variants', 'public_id')->where(fn ($query) => $query->whereNull('deleted_at'))],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'operating_unit_id' => ['nullable', 'integer', 'exists:operating_units,id'],
            'as_of' => ['nullable', 'date'],
        ];
    }

    /**
     * A foreign operating_unit_id/branch_id combo is caller input, not a
     * programming error — reject it with a normal 422 here rather than
     * letting PriceResolutionService's InvalidArgumentException surface as
     * an uncaught 500.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            // If branch_id or operating_unit_id already failed its own rule
            // (missing, non-integer, doesn't exist), querying against it here
            // would add a confusing secondary "doesn't belong to" error on
            // top of the real one, and do a DB query for nothing.
            if ($validator->errors()->hasAny(['branch_id', 'operating_unit_id'])) {
                return;
            }

            // operating_unit_id is optional — nothing to cross-check when
            // it's simply absent from a branch-level request.
            if (! $this->filled('operating_unit_id')) {
                return;
            }

            $belongs = OperatingUnit::where('id', (int) $this->input('operating_unit_id'))
                ->where('branch_id', (int) $this->input('branch_id'))
                ->exists();

            if (! $belongs) {
                $validator->errors()->add('operating_unit_id', 'El Operating Unit indicado no pertenece al Branch indicado.');
            }
        });
    }

    public function resolveItemVariant(): ItemVariant
    {
        return $this->resolveModelByPublicId(ItemVariant::class, 'item_variant_id');
    }

    public function branchId(): int
    {
        return (int) $this->validated('branch_id');
    }

    public function operatingUnitId(): ?int
    {
        $value = $this->validated('operating_unit_id');

        return $value !== null ? (int) $value : null;
    }

    public function asOf(): Carbon
    {
        $value = $this->validated('as_of');

        return $value !== null ? Carbon::parse($value) : Carbon::parse($this->clock->todayInBusinessTz());
    }
}
