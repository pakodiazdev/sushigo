<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->boolean('attendance_exempt')->default(false)->after('is_active')
                ->comment('True for roles (e.g. admin, super-admin) that do not check in/out — excluded from the attendance list');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('attendance_exempt');
        });
    }
};
