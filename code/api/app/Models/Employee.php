<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    // Position roles: reflect the person's role in the organization.
    // Assigned to the linked User (the authenticated identity), not to Employee directly.
    // The fact of being an employee is determined by having an Employee record, not by a role.
    const ROLE_MANAGER = 'manager';

    const ROLE_COOK = 'cook';

    const ROLE_KITCHEN_ASSISTANT = 'kitchen-assistant';

    const ROLE_DELIVERY_DRIVER = 'delivery-driver';

    const ROLE_ACTING_MANAGER = 'acting-manager';

    const ROLE_ADMIN = 'admin';

    const ROLE_SUPER_ADMIN = 'super-admin';

    const ROLE_INVENTORY_MANAGER = 'inventory-manager';

    /**
     * All assignable position roles.
     * admin and super-admin can now be assigned to employees.
     * inventory-manager is a job title with its own permission scope (items, locations, stock).
     */
    const POSITION_ROLES = [
        self::ROLE_MANAGER,
        self::ROLE_COOK,
        self::ROLE_KITCHEN_ASSISTANT,
        self::ROLE_DELIVERY_DRIVER,
        self::ROLE_ACTING_MANAGER,
        self::ROLE_ADMIN,
        self::ROLE_SUPER_ADMIN,
        self::ROLE_INVENTORY_MANAGER,
    ];

    /**
     * Roles that require super-admin privileges to assign.
     */
    const PRIVILEGED_ROLES = [
        self::ROLE_SUPER_ADMIN,
    ];

    /**
     * Get the list of position roles assignable by a given user.
     * null = unrestricted (seeders, CLI). Super-admins also get all roles.
     * Everyone else can assign all roles except super-admin.
     */
    public static function getAssignableRolesFor(?User $user = null): array
    {
        if ($user === null || $user->hasRole(self::ROLE_SUPER_ADMIN)) {
            return self::POSITION_ROLES;
        }

        return array_values(array_diff(self::POSITION_ROLES, self::PRIVILEGED_ROLES));
    }

    protected $fillable = [
        'user_id',
        'code',
        'first_name',
        'last_name',
        'is_active',
        'attendance_exempt',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'attendance_exempt' => 'boolean',
        'meta' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function employmentPeriods(): HasMany
    {
        return $this->hasMany(EmploymentPeriod::class)->orderBy('start_date', 'desc');
    }

    public function wageHistories(): HasMany
    {
        return $this->hasMany(WageHistory::class)->orderBy('effective_from', 'desc');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class)->orderBy('date', 'desc');
    }

    public function leaves(): HasMany
    {
        return $this->hasMany(Leave::class)->orderBy('start_date', 'desc');
    }

    public function negotiatedExtraDays(): HasMany
    {
        return $this->hasMany(NegotiatedExtraDay::class)->orderBy('date', 'desc');
    }

    public function vacationEntitlements(): HasMany
    {
        return $this->hasMany(VacationEntitlement::class)->orderBy('year', 'desc');
    }

    public function employeeRequests(): HasMany
    {
        return $this->hasMany(EmployeeRequest::class)->orderBy('created_at', 'desc');
    }

    public function punctualityExceptions(): HasMany
    {
        return $this->hasMany(PunctualityException::class)->orderBy('effective_from', 'desc');
    }

    public function overtimeBankMovements(): HasMany
    {
        return $this->hasMany(OvertimeBankMovement::class)->orderBy('date', 'desc');
    }

    public function bonusConfigs(): HasMany
    {
        return $this->hasMany(EmployeeBonusConfig::class)->orderBy('effective_from', 'desc');
    }

    /**
     * All schedules for this employee, via their employment periods.
     * For the active schedule use:
     *   $employee->load('employmentPeriods.employeeSchedules')
     */
    public function employeeSchedules(): HasManyThrough
    {
        return $this->hasManyThrough(EmployeeSchedule::class, EmploymentPeriod::class);
    }

    protected static function booted(): void
    {
        static::deleting(function (Employee $employee) {
            $employee->employeeRequests()->each(function (EmployeeRequest $request) {
                if ($request->requestable !== null) {
                    $request->requestable->forceDelete();
                }
                $request->delete();
            });
        });
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
     * When $actingUser is provided, only roles that user is allowed to manage
     * are modified. Roles outside the actor's scope are preserved untouched.
     * This prevents a non-super-admin from accidentally removing super-admin
     * when editing an employee who has that role.
     *
     * When $actingUser is null (e.g. seeders), all POSITION_ROLES are manageable.
     */
    public function syncPositionRoles(array $roleNames, ?User $actingUser = null): void
    {
        if (! $this->user) {
            return;
        }

        // Determine which roles the acting user is allowed to manage
        $manageableRoles = self::getAssignableRolesFor($actingUser);

        // Filter incoming roles to only valid + manageable ones
        $newPositionRoles = array_intersect($roleNames, $manageableRoles);

        $currentRoles = $this->user->getRoleNames()->toArray();

        // Preserve roles that are NOT in the manageable set
        // (includes non-position roles like inventory-manager AND
        //  privileged roles the actor cannot manage)
        $preserved = array_diff($currentRoles, $manageableRoles);

        $this->user->syncRoles(array_unique(array_merge($preserved, $newPositionRoles)));
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
}
