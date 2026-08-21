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
     * A live match always wins over a trashed one: the match columns typically back a
     * partial-unique index scoped to `deleted_at is null` (see e.g. brands_name_unique),
     * so a soft-deleted row and a live replacement can legitimately share the same match
     * value at once. Restoring the trashed row in that case would collide with the live
     * replacement on that same index and crash the seed — preferring the live row keeps
     * re-seeding safe regardless of which row a plain `withTrashed()->firstOrNew()` would
     * have picked.
     *
     * @param  class-string<Model>  $modelClass
     */
    private function upsertRestoringTrashed(string $modelClass, array $match, array $attributes): Model
    {
        $model = $modelClass::where($match)->first()
            ?? $modelClass::withTrashed()->where($match)->first()
            ?? new $modelClass($match);

        $model->fill($attributes);

        $model->trashed() ? $model->restore() : $model->save();

        return $model;
    }
}
