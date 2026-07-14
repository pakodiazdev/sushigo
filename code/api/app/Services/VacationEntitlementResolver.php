<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\VacationEntitlementRule;
use App\Models\Employee;
use App\Models\VacationPolicySetting;
use App\Models\VacationPolicyTier;
use App\Services\VacationRules\CustomVacationPolicy;
use App\Services\VacationRules\VacationsLFTMX;

/**
 * Resolution order: employee override → tenant custom policy → LFT default.
 */
class VacationEntitlementResolver
{
    public function resolve(Employee $employee): VacationEntitlementRule
    {
        if ($employee->vacation_entitlement_rule_key === 'ContractualPolicy') {
            $table = $employee->vacation_entitlement_custom_table;

            if (! empty($table)) {
                return new CustomVacationPolicy($table, 'Política contractual', 'ContractualPolicy');
            }
        }

        return $this->resolveTenantDefault();
    }

    /**
     * The rule that applies tenant-wide, ignoring any employee-level override.
     * Used by the /vacation-policy settings screen to show the currently
     * active tenant rule regardless of any single employee's contract.
     */
    public function resolveTenantDefault(): VacationEntitlementRule
    {
        $settings = VacationPolicySetting::current();

        if ($settings->active_rule_key === 'CustomCompanyPolicy') {
            $tiers = VacationPolicyTier::orderBy('years_from')
                ->get(['years_from', 'days'])
                ->map(fn (VacationPolicyTier $tier) => ['years_from' => $tier->years_from, 'days' => $tier->days])
                ->all();

            if ($tiers !== []) {
                return new CustomVacationPolicy($tiers, 'Política de la empresa', 'CustomCompanyPolicy');
            }
        }

        return new VacationsLFTMX;
    }
}
