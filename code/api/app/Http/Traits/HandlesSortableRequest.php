<?php

namespace App\Http\Traits;

use Illuminate\Database\Eloquent\Builder;

trait HandlesSortableRequest
{
    abstract protected function sortableFields(): array;

    protected function defaultSort(): array
    {
        return [];
    }

    public function sortRules(): array
    {
        return [
            'sort' => ['nullable', 'array'],
            'sort.*' => ['string', 'regex:/^[\w\-\.]+:(asc|desc)$/'],
        ];
    }

    public function parseSorts(): array
    {
        $allowed = $this->sortableFields();
        $sorts = [];

        foreach ($this->input('sort', []) as $entry) {
            $parts = explode(':', $entry, 2);
            $field = $parts[0];
            $direction = $parts[1] ?? 'asc';

            if (in_array($field, $allowed, true)) {
                $sorts[] = ['field' => $field, 'direction' => $direction];
            }
        }

        return $sorts ?: $this->defaultSort();
    }

    public function applySorts(Builder $query): void
    {
        foreach ($this->parseSorts() as $sort) {
            $query->orderBy($sort['field'], $sort['direction']);
        }
    }
}
