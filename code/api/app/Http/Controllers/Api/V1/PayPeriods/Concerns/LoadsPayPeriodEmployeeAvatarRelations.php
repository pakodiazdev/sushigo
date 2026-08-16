<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\PayPeriods\Concerns;

/**
 * The eager-load set every PayPeriod endpoint that returns a PayPeriodResource
 * needs to serve payPeriodEmployees.*.employee.avatar_url without an N+1 (#420)
 * — mirrors Employees\Concerns\LoadsEmployeeUserAvatarRelations, but rooted at
 * payPeriodEmployees.employee.user instead of user. Used by every controller
 * that loads a PayPeriod and returns it through PayPeriodResource (Show,
 * Reopen, Reclose) — PayPeriodEmployeeResource::avatar_url reads this chain
 * directly instead of calling avatarUrl() unloaded, which turns a per-period
 * response into an N+1 across its employees.
 */
trait LoadsPayPeriodEmployeeAvatarRelations
{
    /**
     * @return array<string, \Closure>
     */
    private function payPeriodEmployeeAvatarRelations(): array
    {
        return [
            'payPeriodEmployees.employee.user.mediaAttachments' => fn ($query) => $query->where('is_primary', true),
            'payPeriodEmployees.employee.user.mediaAttachments.mediaGallery.mediaAssets' => fn ($query) => $query->where('is_primary', true),
        ];
    }
}
