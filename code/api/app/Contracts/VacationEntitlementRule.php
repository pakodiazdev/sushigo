<?php

namespace App\Contracts;

interface VacationEntitlementRule
{
    /**
     * Return the number of vacation days earned for the given years of service.
     * $years is 1-based: 1 = first year of employment.
     */
    public function calculate(int $years): int;

    /** Human-readable name shown in the UI (e.g. "LFT México 2022"). */
    public function label(): string;

    /**
     * Stable identifier persisted as VacationEntitlement.rule_key and used by
     * the resolver to tell apart instances of the same strategy class
     * configured at different scopes (e.g. CustomVacationPolicy at the
     * tenant vs. employee level).
     */
    public function key(): string;

    /**
     * Return the full entitlement table as rows of ['years' => string, 'days' => int].
     * Used for the "Reglas aplicables" info panel in the frontend.
     *
     * @return array<int, array{years: string, days: int}>
     */
    public function table(): array;
}
