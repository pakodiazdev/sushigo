<?php

use App\Models\Attendance;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->char('public_id', 26)->unique()->after('id')
                ->comment('ULID — safe for external API exposure.');
        });

        // Backfill any pre-existing rows (development/test databases only)
        Attendance::withoutTimestamps(function () {
            Attendance::whereNull('public_id')->each(function ($attendance) {
                $attendance->update(['public_id' => (string) Str::ulid()]);
            });
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropUnique(['public_id']);
            $table->dropColumn('public_id');
        });
    }
};
