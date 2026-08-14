<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Employees\Concerns;

/**
 * The eager-load set every Employee endpoint that returns an EmployeeResource
 * needs to serve `user.avatar_url` without an N+1 — mirrors
 * Dishes\Dish\Concerns\LoadsDishRelations, but the media chain hangs off the
 * linked User (belongsTo), not the Employee itself.
 * EmployeeResource::avatar_url reads this chain directly instead of calling
 * primaryMediaGallery()/primaryMedia() (each issues its own fresh query per
 * call, which turns a list response into an N+1).
 */
trait LoadsEmployeeUserAvatarRelations
{
    /**
     * @return array<string, Closure>
     */
    private function employeeUserAvatarRelations(): array
    {
        return [
            'user.mediaAttachments' => fn ($query) => $query->where('is_primary', true),
            'user.mediaAttachments.mediaGallery.mediaAssets' => fn ($query) => $query->where('is_primary', true),
        ];
    }
}
