<?php

declare(strict_types=1);

namespace Database\Seeders\Traits;

use Illuminate\Database\Eloquent\Model;

trait RestoresTrashedOnUpsert
{
    /**
     * Match against trashed rows too (so re-seeding a soft-deleted row doesn't insert
     * a duplicate), and restore the row if it was found trashed rather than leaving it
     * soft-deleted with contradictory fresh attribute values (e.g. is_active = true).
     *
     * @param  class-string<Model>  $modelClass
     */
    private function upsertRestoringTrashed(string $modelClass, array $match, array $attributes): Model
    {
        $model = $modelClass::withTrashed()->firstOrNew($match);
        $model->fill($attributes);

        $model->trashed() ? $model->restore() : $model->save();

        return $model;
    }
}
