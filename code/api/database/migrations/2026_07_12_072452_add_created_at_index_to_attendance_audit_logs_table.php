<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('attendance_audit_logs', function (Blueprint $table) {
            // Every /audit-logs list query orders by created_at DESC and the
            // date_from/date_to filters range-scan it — without this index both
            // degrade to a full-table sort as the table grows (see #084 review).
            $table->index('created_at', 'audit_logs_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_audit_logs', function (Blueprint $table) {
            $table->dropIndex('audit_logs_created_at_index');
        });
    }
};
