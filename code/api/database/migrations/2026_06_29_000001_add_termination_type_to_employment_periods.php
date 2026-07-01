<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employment_periods', function (Blueprint $table) {
            $table->string('termination_type')->nullable()->after('termination_reason');
        });
    }

    public function down(): void
    {
        Schema::table('employment_periods', function (Blueprint $table) {
            $table->dropColumn('termination_type');
        });
    }
};
