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

    public function __construct(Employee $model)
    {
        parent::__construct($model);
    }

    /**
     * Load all active employees for a branch with today's attendance and
     * any approved leave covering the given date, ordered by last then first name.
     */
    public function getActiveForReport(int $branchId, string $today): Collection
    {
        $dayOfWeek = Carbon::parse($today)->dayOfWeekIso;

        return $this->newQuery()
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
            ->whereHas('employmentPeriods', fn ($q) => $q
                ->where('branch_id', $branchId)
                ->where('is_active', true)
            )
            ->orderBy('last_name')
            ->orderBy('first_name')
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
        $query = $this->newQuery()->with(['user.roles']);

        if (array_key_exists('is_active', $filters) && $filters['is_active'] !== null) {
            $query->where('is_active', (bool) $filters['is_active']);
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
                $q->where('code', 'ILIKE', "%{$search}%")
                    ->orWhere('first_name', 'ILIKE', "%{$search}%")
                    ->orWhere('last_name', 'ILIKE', "%{$search}%");
            });
        }

        // apply sorts parsed by the request when provided
        foreach ($sorts as $sort) {
            if (! empty($sort['field']) && ! empty($sort['direction'])) {
                $query->orderBy($sort['field'], $sort['direction']);
            }
        }

        return $query->paginate($perPage);
    }
}
