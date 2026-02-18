<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add a `selector` column to password_reset_tokens.
     *
     * The selector pattern splits the reset link into two parts:
     *   - selector : random, stored in plain text, indexed — O(1) row lookup
     *   - token    : random, stored hashed (bcrypt)       — the secret verifier
     *
     * URL format: /reset-password?t={plainToken}.{selector}
     *
     * This replaces the previous full-table bcrypt scan (O(n)) with a
     * single indexed query + one Hash::check(), eliminating the performance
     * issue with large numbers of tokens.
     *
     * nullable() is intentional: tokens created before this migration have
     * no selector (NULL). PostgreSQL/MySQL allow multiple NULLs in a unique
     * index, so existing in-flight rows are unaffected — they expire naturally.
     */
    public function up(): void
    {
        Schema::table('password_reset_tokens', function (Blueprint $table) {
            $table->string('selector', 24)->nullable()->unique()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('password_reset_tokens', function (Blueprint $table) {
            $table->dropUnique(['selector']);
            $table->dropColumn('selector');
        });
    }
};
