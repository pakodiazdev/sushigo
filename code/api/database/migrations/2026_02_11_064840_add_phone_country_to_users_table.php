<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add phone_country column to separate country code from phone number.
     * The phone column will store only the national number without country code.
     * phone_country stores the country code (e.g., "+52" for Mexico).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone_country', 5)->nullable()->after('phone')
                ->comment('Phone country code (e.g., +52 for Mexico)');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('phone_country');
        });
    }
};
