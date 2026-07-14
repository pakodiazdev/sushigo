<?php

namespace App\Services\VacationRules;

use App\Contracts\VacationEntitlementRule;
use Illuminate\Support\Collection;

/**
 * Generic table-driven vacation policy — used for both the tenant-level
 * "CustomCompanyPolicy" and the employee-level "ContractualPolicy" override.
 * Both scopes share this same runtime strategy; only the source of the
 * table (tenant settings vs. the employee record) and the injected
 * label/key differ. See App\Services\VacationEntitlementResolver.
 */
class CustomVacationPolicy implements VacationEntitlementRule
{
    /**
     * @param  array<int, array{years_from: int, days: int}>  $tiers
     */
    public function __construct(
        private readonly array $tiers,
        private readonly string $label,
        private readonly string $key,
    ) {}

    public function calculate(int $years): int
    {
        $applicable = $this->sortedTiers()
            ->filter(fn (array $tier) => $tier['years_from'] <= $years)
            ->last();

        return $applicable['days'] ?? 0;
    }

    public function label(): string
    {
        return $this->label;
    }

    public function key(): string
    {
        return $this->key;
    }

    public function table(): array
    {
        $sorted = $this->sortedTiers()->values();

        return $sorted
            ->map(function (array $tier, int $index) use ($sorted) {
                $next = $sorted->get($index + 1);

                return [
                    'years' => $this->rangeLabel($tier['years_from'], $next['years_from'] ?? null),
                    'days' => $tier['days'],
                ];
            })
            ->all();
    }

    private function rangeLabel(int $from, ?int $nextFrom): string
    {
        if ($nextFrom === null) {
            return "{$from}+";
        }

        $to = $nextFrom - 1;

        return $to === $from ? (string) $from : "{$from}–{$to}";
    }

    /**
     * @return Collection<int, array{years_from: int, days: int}>
     */
    private function sortedTiers(): Collection
    {
        return collect($this->tiers)->sortBy('years_from')->values();
    }
}
