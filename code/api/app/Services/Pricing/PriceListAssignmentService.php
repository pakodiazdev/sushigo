<?php

namespace App\Services\Pricing;

use App\Models\Branch;
use App\Models\OperatingUnit;
use App\Models\PriceList;
use App\Models\PriceListAssignment;
use App\Services\Pricing\Concerns\EvaluatesEffectiveRanges;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns the invariants a PriceListAssignment must never violate: an
 * OperatingUnit must actually belong to the given Branch, and two active
 * assignments to the exact same context must never carry the same
 * PriceList priority while their effective windows overlap — that specific
 * combination is the only thing that could make PriceResolutionService's
 * result ambiguous. Different priorities overlapping is fine (intended
 * layering — the higher priority wins).
 */
class PriceListAssignmentService
{
    use EvaluatesEffectiveRanges;

    public function create(array $data): PriceListAssignment
    {
        return DB::transaction(function () use ($data) {
            $this->lockContext($data['branch_id'], $data['operating_unit_id'] ?? null);
            $this->guardOperatingUnitBelongsToBranch($data['branch_id'], $data['operating_unit_id'] ?? null);

            if ($data['is_active'] ?? true) {
                $this->guardNoPriorityTie(
                    $data['price_list_id'],
                    $data['branch_id'],
                    $data['operating_unit_id'] ?? null,
                    $data['effective_from'],
                    $data['effective_to'] ?? null,
                );
            }

            return PriceListAssignment::create($data);
        });
    }

    public function update(PriceListAssignment $assignment, array $data): PriceListAssignment
    {
        return DB::transaction(function () use ($assignment, $data) {
            $branchId = $data['branch_id'] ?? $assignment->branch_id;
            $operatingUnitId = array_key_exists('operating_unit_id', $data)
                ? $data['operating_unit_id']
                : $assignment->operating_unit_id;
            $priceListId = $data['price_list_id'] ?? $assignment->price_list_id;
            $effectiveFrom = $data['effective_from'] ?? $assignment->effective_from->toDateString();
            $effectiveTo = array_key_exists('effective_to', $data)
                ? $data['effective_to']
                : $assignment->effective_to?->toDateString();
            $willBeActive = array_key_exists('is_active', $data) ? (bool) $data['is_active'] : $assignment->is_active;

            $this->lockContext($branchId, $operatingUnitId);
            $this->guardOperatingUnitBelongsToBranch($branchId, $operatingUnitId);

            if ($willBeActive) {
                $this->guardNoPriorityTie($priceListId, $branchId, $operatingUnitId, $effectiveFrom, $effectiveTo, excludeId: $assignment->id);
            }

            $assignment->update($data);

            return $assignment->fresh();
        });
    }

    /**
     * Called by PriceListService before changing a PriceList's priority —
     * that alone can turn a previously-safe overlapping pair of active
     * assignments (different priorities, so allowed at write time) into an
     * unresolvable tie, without either assignment itself ever being
     * written again. Checked against every one of the PriceList's own
     * active assignments, locked for the duration of the check.
     *
     * Every candidate PriceList's row (this one and every other one found
     * overlapping) is locked, in id order, via lockPriceLists() before any
     * priority is read — see that method for why a plain unlocked read is
     * not enough to make this race-safe against a concurrent priority
     * change on one of the *other* candidate lists.
     */
    public function guardPriorityChangeIsSafe(PriceList $priceList, int $newPriority): void
    {
        if ($newPriority === $priceList->priority) {
            return;
        }

        $assignments = PriceListAssignment::where('price_list_id', $priceList->id)
            ->active()
            ->lockForUpdate()
            ->get();

        $candidatesByAssignment = $assignments->mapWithKeys(function ($assignment) use ($priceList) {
            $query = PriceListAssignment::query()
                ->active()
                ->where('id', '!=', $assignment->id)
                ->where('price_list_id', '!=', $priceList->id)
                ->where('branch_id', $assignment->branch_id)
                ->when(
                    $assignment->operating_unit_id !== null,
                    fn ($q) => $q->where('operating_unit_id', $assignment->operating_unit_id),
                    fn ($q) => $q->whereNull('operating_unit_id'),
                );

            return [$assignment->id => $this->whereOverlapsRange(
                $query,
                $assignment->effective_from->toDateString(),
                $assignment->effective_to?->toDateString(),
            )->get()];
        });

        $candidatePriceListIds = $candidatesByAssignment->flatten(1)->pluck('price_list_id')->push($priceList->id);
        $priceLists = $this->lockPriceLists($candidatePriceListIds);

        foreach ($candidatesByAssignment as $candidates) {
            // A candidate whose PriceList is soft-deleted has no row in
            // $priceLists (lockPriceLists() resolves through the Eloquent
            // model, which excludes trashed rows by default) — deleting a
            // PriceList doesn't cascade to its assignments, so a lingering
            // active assignment can still surface here. Such a candidate
            // can never actually be selected by PriceResolutionService, so
            // it's not a real tie — skip it instead of reading a null
            // priority.
            $conflict = $candidates
                ->filter(fn ($candidate) => $priceLists->has($candidate->price_list_id))
                ->contains(fn ($candidate) => $priceLists[$candidate->price_list_id]->priority === $newPriority);

            if ($conflict) {
                throw ValidationException::withMessages([
                    'priority' => 'Cambiar la prioridad crearía un empate con otra asignación activa que se traslapa en el mismo contexto.',
                ]);
            }
        }
    }

    /**
     * Locks the parent Branch (or, for an Operating-Unit-scoped context, the
     * Operating Unit) row in addition to any existing price_list_assignments
     * rows. Locking only price_list_assignments rows locks nothing when a
     * context has zero assignments yet, so two concurrent first inserts
     * could both pass guardNoPriorityTie() and commit conflicting
     * same-priority overlapping assignments; locking the always-existing
     * parent row serializes that case too (same pattern as
     * VariantPurchasePresentationService::lockVariantPresentations()).
     */
    private function lockContext(int $branchId, ?int $operatingUnitId): void
    {
        if ($operatingUnitId !== null) {
            OperatingUnit::where('id', $operatingUnitId)->lockForUpdate()->first();
        } else {
            Branch::where('id', $branchId)->lockForUpdate()->first();
        }

        PriceListAssignment::where('branch_id', $branchId)
            ->when($operatingUnitId !== null, fn ($q) => $q->where('operating_unit_id', $operatingUnitId), fn ($q) => $q->whereNull('operating_unit_id'))
            ->lockForUpdate()
            ->get();
    }

    private function guardOperatingUnitBelongsToBranch(int $branchId, ?int $operatingUnitId): void
    {
        if ($operatingUnitId === null) {
            return;
        }

        $belongs = OperatingUnit::where('id', $operatingUnitId)->where('branch_id', $branchId)->exists();

        if (! $belongs) {
            throw ValidationException::withMessages([
                'operating_unit_id' => 'El Operating Unit indicado no pertenece al Branch indicado.',
            ]);
        }
    }

    private function guardNoPriorityTie(
        int $priceListId,
        int $branchId,
        ?int $operatingUnitId,
        string $effectiveFrom,
        ?string $effectiveTo,
        ?int $excludeId = null,
    ): void {
        $query = PriceListAssignment::query()
            ->active()
            ->where('branch_id', $branchId)
            ->when($operatingUnitId !== null, fn ($q) => $q->where('operating_unit_id', $operatingUnitId), fn ($q) => $q->whereNull('operating_unit_id'))
            ->where('price_list_id', '!=', $priceListId)
            ->when($excludeId !== null, fn ($q) => $q->where('id', '!=', $excludeId));

        $candidates = $this->whereOverlapsRange($query, $effectiveFrom, $effectiveTo)->get();

        // Lock this PriceList and every candidate's PriceList, in a fixed id
        // order, before comparing priorities. A plain unlocked read here
        // (this method's own priority, or the whereHas('priceList', ...)
        // join it used to compare against) can observe another
        // transaction's pre-commit priority under read-committed isolation,
        // letting two concurrent priority changes to two *different* lists
        // both pass and land on the same priority for an overlapping
        // context. guardPriorityChangeIsSafe() locks the same rows in the
        // same order, so the two guards serialize against each other too.
        $priceLists = $this->lockPriceLists($candidates->pluck('price_list_id')->push($priceListId));

        // The assignment's own PriceList can be soft-deleted without
        // cascading to the assignment itself — e.g. an update that doesn't
        // touch price_list_id falls back to the assignment's current,
        // now-trashed one. Such an assignment can never resolve to a price
        // (PriceResolutionService excludes trashed PriceLists too), so it
        // has no business staying active; reject the write cleanly instead
        // of indexing a priority that lockPriceLists() never returned.
        if (! $priceLists->has($priceListId)) {
            throw ValidationException::withMessages([
                'price_list_id' => 'El Price List de esta asignación ya no existe; no puede permanecer activa.',
            ]);
        }

        $thisPriority = $priceLists[$priceListId]->priority;

        // See guardPriorityChangeIsSafe() for why a candidate absent from
        // $priceLists (its PriceList soft-deleted, without cascading to its
        // still-active assignment) must be skipped rather than read.
        $conflict = $candidates
            ->filter(fn ($candidate) => $priceLists->has($candidate->price_list_id))
            ->contains(fn ($candidate) => $priceLists[$candidate->price_list_id]->priority === $thisPriority);

        if ($conflict) {
            throw ValidationException::withMessages([
                'price_list_id' => 'Ya existe una asignación activa con la misma prioridad para este contexto en un rango de fechas que se traslapa.',
            ]);
        }
    }

    /**
     * @param  Collection<int, int>  $priceListIds
     * @return Collection<int, PriceList> Keyed by id.
     */
    private function lockPriceLists(Collection $priceListIds): Collection
    {
        return PriceList::whereIn('id', $priceListIds->unique()->sort()->values())
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
    }
}
