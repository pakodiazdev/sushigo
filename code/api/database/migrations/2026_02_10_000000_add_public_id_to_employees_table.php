<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->char('public_id', 26)->after('id')->nullable();
        });

        DB::table('employees')->whereNull('public_id')->eachById(function ($employee) {
            DB::table('employees')
                ->where('id', $employee->id)
                ->update(['public_id' => (string) Str::ulid()]);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->char('public_id', 26)->nullable(false)->unique()->change();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('public_id');
        });
    }
};
