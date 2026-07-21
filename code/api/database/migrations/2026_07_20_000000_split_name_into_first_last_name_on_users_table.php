<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name', 100)->nullable()->after('id');
            $table->string('last_name', 100)->nullable()->after('first_name');
        });

        // Prefer employees.first_name/last_name for linked employees — that's the name
        // Employee API responses have been surfacing (and what #086 was filed to fix
        // drift on), so it's the more trustworthy source even when it had already
        // drifted from users.name.
        DB::table('employees')
            ->whereNotNull('user_id')
            ->select('user_id', 'first_name', 'last_name')
            ->orderBy('user_id')
            ->get()
            ->each(function ($employee) {
                DB::table('users')
                    ->where('id', $employee->user_id)
                    ->whereNull('first_name')
                    ->update(['first_name' => $employee->first_name, 'last_name' => $employee->last_name]);
            });

        // Remaining users (no linked employee, e.g. super-admin) — split the single name field.
        DB::table('users')->whereNull('first_name')->eachById(function ($user) {
            [$firstName, $lastName] = $this->splitName($user->name);

            DB::table('users')
                ->where('id', $user->id)
                ->update(['first_name' => $firstName, 'last_name' => $lastName]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name', 100)->nullable(false)->change();
            $table->string('last_name', 100)->nullable(false)->change();
            $table->dropColumn('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');
        });

        DB::table('users')->eachById(function ($user) {
            DB::table('users')
                ->where('id', $user->id)
                ->update(['name' => trim("{$user->first_name} {$user->last_name}")]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable(false)->change();
            $table->dropColumn(['first_name', 'last_name']);
        });
    }

    /**
     * Split a single "name" value into [first_name, last_name].
     * First word becomes first_name, remainder becomes last_name (empty if single-word).
     */
    private function splitName(?string $name): array
    {
        $parts = preg_split('/\s+/', trim((string) $name), 2);

        return [$parts[0] ?? '', $parts[1] ?? ''];
    }
};
