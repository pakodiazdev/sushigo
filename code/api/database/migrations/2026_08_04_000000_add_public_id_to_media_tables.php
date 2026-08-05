<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Tables in the Media domain that exposed their raw sequential id in
     * URLs (media_gallery_id, assets/{id}) and JSON responses. Same
     * enumeration/IDOR hardening as #293.
     */
    private const TABLES = [
        'media_galleries',
        'media_assets',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->char('public_id', 26)->after('id')->nullable();
            });

            DB::table($table)->whereNull('public_id')->eachById(function ($row) use ($table) {
                DB::table($table)
                    ->where('id', $row->id)
                    ->update(['public_id' => (string) Str::ulid()]);
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
