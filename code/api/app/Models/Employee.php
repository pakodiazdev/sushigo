<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Permission\Traits\HasRoles;

class Employee extends Model
{
    use HasFactory, HasPublicId, HasRoles, SoftDeletes;

    protected string $guard_name = 'api';

    const ROLE_MANAGER = 'employee-manager';
    const ROLE_COOK = 'employee-cook';
    const ROLE_KITCHEN_ASSISTANT = 'employee-kitchen-assistant';
    const ROLE_DELIVERY_DRIVER = 'employee-delivery-driver';
    const ROLE_ACTING_MANAGER = 'employee-acting-manager';

    const POSITION_ROLES = [
        self::ROLE_MANAGER,
        self::ROLE_COOK,
        self::ROLE_KITCHEN_ASSISTANT,
        self::ROLE_DELIVERY_DRIVER,
        self::ROLE_ACTING_MANAGER,
    ];

    protected $fillable = [
        'user_id',
        'code',
        'first_name',
        'last_name',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /** System roles that are managed by employee position sync. */
    const EMPLOYEE_SYSTEM_ROLES = ['employee', 'employee-manager'];

    /**
     * Sync employee position roles and update the linked User's system role accordingly.
     *
     * If the employee holds employee-manager → User gets 'employee-manager'.
     * Otherwise → User gets 'employee'.
     *
     * Preserves any non-employee system roles (admin, super-admin, etc.) on the User.
     */
    public function syncPositionRoles(array $roleNames): void
    {
        // Filter to only valid position roles
        $roleNames = array_intersect($roleNames, self::POSITION_ROLES);

        $this->syncRoles($roleNames);

        // Update the linked User's system role (preserving non-employee roles)
        if ($this->user) {
            $newSystemRole = in_array(self::ROLE_MANAGER, $roleNames)
                ? 'employee-manager'
                : 'employee';

            // Keep existing roles that aren't employee-domain, then add the new one
            $currentRoles = $this->user->getRoleNames()->toArray();
            $preservedRoles = array_diff($currentRoles, self::EMPLOYEE_SYSTEM_ROLES);
            $preservedRoles[] = $newSystemRole;

            $this->user->syncRoles(array_unique($preservedRoles));
        }
    }

    /** @return array<string, mixed> */
    public function toApiArray(): array
    {
        return [
            'id' => $this->public_id,
            'code' => $this->code,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'roles' => $this->roles->pluck('name')->values()->toArray(),
            'is_active' => $this->is_active,
            'email' => $this->user?->email,
            'phone' => $this->user?->phone,
            'phone_country' => $this->user?->phone_country,
            'meta' => $this->meta,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
