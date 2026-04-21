<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('negotiated_extra_days', function (Blueprint $table) {
            $table->foreignId('request_id')
                ->nullable()
                ->after('employee_id')
                ->constrained('employee_requests')
                ->nullOnDelete();

            $table->unique('request_id');
        });
    }

    public function down(): void
    {
        Schema::table('negotiated_extra_days', function (Blueprint $table) {
            $table->dropUnique(['request_id']);
            $table->dropConstrainedForeignId('request_id');
        });
    }
};
