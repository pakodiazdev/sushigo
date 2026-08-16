<?php

namespace App\Repositories;

use App\Models\Employee;
use App\Repositories\Concerns\HasPublicId;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class EmployeeRepository extends BaseRepository
{
    use HasPublicId;

    /**
     * Explicit column list for queries that join users — avoids ambiguous-column
     * errors from users sharing column names with employees (e.g. id, created_at).
     */
    private const SELECT_EMPLOYEE_COLUMNS = 'employees.*';

    public function __construct(Employee $model)
    {
        parent::__construct($model);
    }

    /**
     * Load all active employees for a branch with today's attendance and
     * any approved leave covering the given date, ordered by last then first name.
     * Employees marked `attendance_exempt` (e.g. admin, super-admin) are excluded.
     */
    public function getActiveForReport(int $branchId, string $today): Collection
    {
        $dayOfWeek = Carbon::parse($today)->dayOfWeekIso;

        return $this->newQuery()
            ->select(self::SELECT_EMPLOYEE_COLUMNS)
            ->leftJoin('users', 'users.id', '=', 'employees.user_id')
            ->with([
                'user.roles',
                'attendances' => fn ($q) => $q->whereDate('date', $today),
                'leaves' => fn ($q) => $q
                    ->approved()
                    ->forDate($today)
                    ->reorder()
                    ->oldest('id'),
                'employmentPeriods' => fn ($q) => $q
                    ->where('branch_id', $branchId)
                    ->where('is_active', true)
                    ->with([
                        'employeeSchedules' => fn ($sq) => $sq
                            ->effective($today)
                            ->with([
                                'scheduleDays' => fn ($dq) => $dq->where('day_of_week', $dayOfWeek),
                            ]),
                    ]),
            ])
            ->where('employees.attendance_exempt', false)
            ->whereHas('employmentPeriods', fn ($q) => $q
                ->where('branch_id', $branchId)
                ->where('is_active', true)
            )
            ->orderBy('users.last_name')
            ->orderBy('users.first_name')
            ->get();
    }

    /**
     * Active employees with an active employment period in the given branch,
     * ordered by last name then first name. Used by the pay period preview,
     * close, and reclose flows.
     */
    public function getActiveForPayPeriod(int $branchId): Collection
    {
        return $this->newQuery()
            ->select(self::SELECT_EMPLOYEE_COLUMNS)
            ->leftJoin('users', 'users.id', '=', 'employees.user_id')
            ->with([
                'employmentPeriods',
                'user',
                // #420 — PayPeriodPreviewService::buildEmployeePreview reads
                // User::avatarUrl() from this same chain; without it every row
                // would lazy-load its own mediaAttachments query.
                'user.mediaAttachments' => fn ($q) => $q->where('is_primary', true),
                'user.mediaAttachments.mediaGallery.mediaAssets' => fn ($q) => $q->where('is_primary', true),
            ])
            ->whereHas('employmentPeriods', fn ($q) => $q
                ->where('branch_id', $branchId)
                ->where('is_active', true)
            )
            ->where('employees.is_active', true)
            ->orderBy('users.last_name')
            ->orderBy('users.first_name')
            ->get();
    }

    /**
     * Paginate an index of employees applying filters and sorts.
     *
     * @param  array  $sorts  Array of ['field' => string, 'direction' => 'asc'|'desc']
     */
    public function paginateIndex(array $filters = [], array $sorts = [], int $perPage = 15): LengthAwarePaginator
    {
        // Roles live on User — only 'user' relation needed on Employee
        $query = $this->newQuery()
            ->select(self::SELECT_EMPLOYEE_COLUMNS)
            ->leftJoin('users', 'users.id', '=', 'employees.user_id')
            ->with(['user.roles']);

        if (array_key_exists('is_active', $filters) && $filters['is_active'] !== null) {
            $query->where('employees.is_active', (bool) $filters['is_active']);
        }

        if (! empty($filters['role'])) {
            // Filter employees whose linked User holds the given position role
            $role = $filters['role'];
            $query->whereHas('user', fn ($q) => $q->role($role));
        }

        if (! empty($filters['search'])) {
            // Escape SQL LIKE wildcards to avoid pattern injection when users include % or _
            $search = $filters['search'];
            $search = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search);

            $query->where(function ($q) use ($search) {
                $q->where('employees.code', 'ILIKE', "%{$search}%")
                    ->orWhere('users.first_name', 'ILIKE', "%{$search}%")
                    ->orWhere('users.last_name', 'ILIKE', "%{$search}%");
            });
        }

        // apply sorts parsed by the request when provided
        // created_at/updated_at exist on both joined tables and must be qualified —
        // every other sortable field (code, is_active, first_name, last_name) is
        // unambiguous under the join.
        $columnMap = ['created_at' => 'employees.created_at', 'updated_at' => 'employees.updated_at'];

        foreach ($sorts as $sort) {
            if (! empty($sort['field']) && ! empty($sort['direction'])) {
                $query->orderBy($columnMap[$sort['field']] ?? $sort['field'], $sort['direction']);
            }
        }

        return $query->paginate($perPage);
    }
}
