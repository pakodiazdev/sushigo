<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\VacationPolicySetting;
use App\Models\VacationPolicyTier;
use Illuminate\Support\Facades\DB;

class VacationPolicySettingService
{
    /**
     * Atomically sets the tenant's active vacation rule and, when switching to
     * CustomCompanyPolicy, replaces the custom tiers with the given list.
     * Switching back to VacationsLFTMX preserves any existing custom tiers so
     * they are available if re-enabled later.
     *
     * @param  array<int, array{years_from: int, days: int}>|null  $tiers  Already sorted by years_from.
     */
    public function update(string $activeRuleKey, ?array $tiers): void
    {
        DB::transaction(function () use ($activeRuleKey, $tiers) {
            VacationPolicySetting::current()->update(['active_rule_key' => $activeRuleKey]);

            if ($activeRuleKey !== 'CustomCompanyPolicy') {
                return;
            }

            VacationPolicyTier::query()->delete();

            collect($tiers)->each(fn (array $item, int $index) => VacationPolicyTier::create([
                'years_from' => $item['years_from'],
                'days' => $item['days'],
                'sort_order' => $index + 1,
            ]));
        });
    }
}
