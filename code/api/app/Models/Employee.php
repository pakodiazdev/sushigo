<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    // Position roles: reflect the person's role in the organization.
    // Assigned to the linked User (the authenticated identity), not to Employee directly.
    // The fact of being an employee is determined by having an Employee record, not by a role.
    const ROLE_MANAGER          = 'manager';
    const ROLE_COOK             = 'cook';
    const ROLE_KITCHEN_ASSISTANT= 'kitchen-assistant';
    const ROLE_DELIVERY_DRIVER  = 'delivery-driver';
    const ROLE_ACTING_MANAGER   = 'acting-manager';

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

    /**
     * Sync the employee's position roles onto the linked User.
     *
     * Roles live on User (the authenticated identity), never on Employee directly.
     * Employee is the profile entity — User carries the permissions.
     *
     * Roles reflect the person's role in the organization (manager, cook, etc.).
     * The fact of being an employee is determined by having an Employee record,
     * not by a role. Non-employee-domain roles (admin, super-admin, etc.) are preserved.
     */
    public function syncPositionRoles(array $roleNames): void
    {
        $positionRoles = array_intersect($roleNames, self::POSITION_ROLES);

        if (! $this->user) {
            return;
        }

        // Preserve only roles outside the employee position domain
        $currentRoles = $this->user->getRoleNames()->toArray();
        $preserved    = array_diff($currentRoles, self::POSITION_ROLES);

        $this->user->syncRoles(array_unique(array_merge($preserved, $positionRoles)));
    }

    /**
     * Return the employee's current position roles (job titles).
     * These are read from the linked User's roles, filtered to POSITION_ROLES.
     */
    public function getPositionRoles(): array
    {
        if (! $this->user) {
            return [];
        }

        return $this->user
            ->getRoleNames()
            ->filter(fn ($r) => in_array($r, self::POSITION_ROLES))
            ->values()
            ->toArray();
    }

    /** @return array<string, mixed> */
    public function toApiArray(): array
    {
        return [
            'id'           => $this->public_id,
            'code'         => $this->code,
            'first_name'   => $this->first_name,
            'last_name'    => $this->last_name,
            'roles'        => $this->getPositionRoles(),
            'is_active'    => $this->is_active,
            'email'        => $this->user?->email,
            'phone'        => $this->user?->phone,
            'phone_country' => $this->user?->phone_country,
            'meta'         => $this->meta,
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
        ];
    }
}
