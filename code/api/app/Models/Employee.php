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

    // Position roles: the job title the employee holds within the company.
    // These are assigned to the linked User, not to Employee directly.
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

    /**
     * System roles that belong to the employee domain.
     * Used to preserve non-employee roles on the User when syncing.
     */
    const EMPLOYEE_SYSTEM_ROLES = ['employee', 'employee-manager'];

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
     * Sync employee position roles onto the linked User.
     *
     * Roles live on User (the authenticated entity), never on Employee.
     * Employee is a profile — User is the identity that carries permissions.
     *
     * Position roles (employee-cook, employee-manager, etc.) describe the
     * job title. The system role (employee / employee-manager) reflects
     * the access level inside the app.
     *
     * Logic:
     *   - employee-manager position  → User gets 'employee-manager' system role
     *   - any other position         → User gets 'employee' system role
     *   - Non-employee roles (admin, super-admin, inventory-manager, etc.)
     *     are preserved unchanged.
     */
    public function syncPositionRoles(array $roleNames): void
    {
        // Keep only valid position roles
        $positionRoles = array_intersect($roleNames, self::POSITION_ROLES);

        if (! $this->user) {
            return;
        }

        $newSystemRole = in_array(self::ROLE_MANAGER, $positionRoles)
            ? 'employee-manager'
            : 'employee';

        // Preserve only truly non-employee-domain roles (admin, super-admin, etc.)
        // We must exclude BOTH system roles AND all position roles so that a previous
        // syncPositionRoles call (e.g. cook) does not bleed into a later one (e.g. manager).
        $employeeDomainRoles = array_merge(self::EMPLOYEE_SYSTEM_ROLES, self::POSITION_ROLES);
        $currentRoles        = $this->user->getRoleNames()->toArray();
        $preserved           = array_diff($currentRoles, $employeeDomainRoles);
        $preserved[]         = $newSystemRole;

        // Add position roles (job titles) alongside system roles
        $allRoles = array_unique(array_merge($preserved, $positionRoles));

        $this->user->syncRoles($allRoles);
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
