<?php

namespace App\Repositories;

use App\Models\Employee;
use App\Repositories\Concerns\HasPublicId;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class EmployeeRepository extends BaseRepository
{
    use HasPublicId;

    public function __construct(Employee $model)
    {
        parent::__construct($model);
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
