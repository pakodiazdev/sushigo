<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class UserRepository extends BaseRepository
{
    public function __construct(User $model)
    {
        parent::__construct($model);
    }

    /**
     * Look up a non-expired password reset record by its selector.
     *
     * The selector is stored in plain text and indexed (unique), so this
     * is a single O(1) query — no full-table scan required.
     * The caller must still verify the hashed token with Hash::check().
     */
    public function findByResetSelector(string $selector): ?object
    {
        $expireMinutes = config('auth.passwords.users.expire', 60);
        $table         = config('auth.passwords.users.table', 'password_reset_tokens');

        return DB::table($table)
            ->where('selector', $selector)
            ->where('created_at', '>=', now()->subMinutes($expireMinutes))
            ->first();
    }

    /**
     * Insert or replace a password reset token record for the given identifier.
     *
     * Uses updateOrInsert so that repeated forgot-password requests for the
     * same user overwrite the previous row (one row per identifier via the
     * email primary key).
     */
    public function createResetToken(string $identifier, string $selector, string $hashedToken): void
    {
        $table = config('auth.passwords.users.table', 'password_reset_tokens');

        DB::table($table)->updateOrInsert(
            ['email'    => $identifier],
            ['selector' => $selector, 'token' => $hashedToken, 'created_at' => now()]
        );
    }

    /**
     * Delete the password reset record after a successful reset.
     *
     * Replaces the cleanup that Password::reset() used to perform internally.
     */
    public function deleteResetToken(string $identifier): void
    {
        $table = config('auth.passwords.users.table', 'password_reset_tokens');

        DB::table($table)->where('email', $identifier)->delete();
    }
}
