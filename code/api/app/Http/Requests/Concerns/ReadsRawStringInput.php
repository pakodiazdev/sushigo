<?php

namespace App\Http\Requests\Concerns;

/**
 * FormRequest::authorize() runs before the validator, so fields normally
 * guarded by a `string` validation rule (media_gallery_id, owner_token) are
 * still completely unvalidated at that point — a caller sending one as an
 * array (`field[]=x`) would reach typed code (a DB query bound to a scalar
 * column, a `?string` parameter) unguarded and crash with a 500 instead of
 * failing validation cleanly. Reading through this instead treats anything
 * that isn't actually a string as absent, so the later `string` rule is
 * what rejects it — a normal 422, not an uncaught exception.
 */
trait ReadsRawStringInput
{
    protected function rawStringInput(string $field): ?string
    {
        $value = $this->input($field);

        return is_string($value) ? $value : null;
    }
}
