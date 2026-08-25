<?php

namespace App\Services\Pricing;

use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\PriceListAssignment;
use App\Services\Pricing\Concerns\EvaluatesEffectiveRanges;
use App\Support\Clock\ApplicationClock;
use Closure;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Resolves a Variant's authoritative sale price from effective, authorized
 * price-list evidence only — never reads ItemVariant.sale_price. See
 * doc/architecture/pricing/pricing-architecture.en.md for the full algorithm.
 */
class PriceResolutionService
{
    use EvaluatesEffectiveRanges;

    public function __construct(private readonly ApplicationClock $clock) {}

    public function resolve(ItemVariant $variant, int $branchId, ?int $operatingUnitId, ?Carbon $asOf = null): PriceResolutionResult
    {
        // Business logic must read "today" via ApplicationClock, not
        // Carbon::now() directly — the app runs in UTC (config/app.timezone)
        // while resolution should follow the configured business timezone,
        // and ApplicationClock is also what test/simulated-clock scenarios
        // control (see doc: "Business logic must read current time via this
        // interface, not directly from now() or Carbon::now()").
        $asOf ??= Carbon::parse($this->clock->todayInBusinessTz());

        if ($operatingUnitId !== null) {
            $belongs = OperatingUnit::where('id', $operatingUnitId)
                ->where('branch_id', $branchId)
                ->exists();

            if (! $belongs) {
                throw new InvalidArgumentException("Operating Unit {$operatingUnitId} does not belong to Branch {$branchId}.");
            }
        }

        $tiers = [];

        if ($operatingUnitId !== null) {
            $tiers[] = $this->candidateAssignments($asOf, function ($query) use ($branchId, $operatingUnitId) {
                $query->where('branch_id', $branchId)->where('operating_unit_id', $operatingUnitId);
            });
        }

        $tiers[] = $this->candidateAssignments($asOf, function ($query) use ($branchId) {
            $query->where('branch_id', $branchId)->whereNull('operating_unit_id');
        });

        foreach ($tiers as $assignments) {
            foreach ($assignments as $assignment) {
                $price = $this->whereEffectiveOn(
                    $variant->prices()->active()->where('price_list_id', $assignment->price_list_id),
                    $asOf
                )->first();

                if ($price !== null) {
                    return PriceResolutionResult::found((string) $price->price, $assignment->priceList, $assignment);
                }
            }
        }

        return PriceResolutionResult::none();
    }

    /**
     * Active, effective-on-$asOf assignments matching $scope whose PriceList
     * is also active, ordered by PriceList priority (desc) then assignment
     * id (asc) as a defensive tiebreak — PriceListAssignmentService already
     * forbids a genuine priority tie within the same context, so this only
     * guards against data that predates that validation.
     *
     * @return Collection<int, PriceListAssignment>
     */
    private function candidateAssignments(Carbon $asOf, Closure $scope): Collection
    {
        $query = PriceListAssignment::query()
            ->active()
            ->whereHas('priceList', fn ($q) => $q->where('is_active', true))
            ->with('priceList');

        $scope($query);

        $assignments = $this->whereEffectiveOn($query, $asOf)->get();

        return $assignments->sort(function (PriceListAssignment $a, PriceListAssignment $b) {
            $byPriorityDesc = $b->priceList->priority <=> $a->priceList->priority;

            return $byPriorityDesc !== 0 ? $byPriorityDesc : $a->id <=> $b->id;
        })->values();
    }
}
