<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->string('overtime_valuation_method')->nullable()->after('overtime_authorized_at');
            $table->decimal('overtime_rate_applied', 8, 2)->nullable()->after('overtime_valuation_method');
            $table->decimal('overtime_amount', 10, 2)->nullable()->after('overtime_rate_applied');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn(['overtime_valuation_method', 'overtime_rate_applied', 'overtime_amount']);
        });
    }
};
