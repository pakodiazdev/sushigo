<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /** Tables whose externally exposed identity is now a ULID (#399). */
    private const TABLES = [
        'items', 'item_variants', 'stock', 'stock_movements', 'stock_movement_lines',
        'inventory_locations', 'units_of_measure',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->char('public_id', 26)->after('id')->nullable();
            });

            DB::table($table)->whereNull('public_id')->eachById(function (object $row) use ($table) {
                DB::table($table)->where('id', $row->id)->update(['public_id' => (string) Str::ulid()]);
            });

            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->char('public_id', 26)->nullable(false)->unique()->change();
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropColumn('public_id');
            });
        }
    }
};
