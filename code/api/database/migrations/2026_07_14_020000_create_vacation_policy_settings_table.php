<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vacation_policy_settings', function (Blueprint $table) {
            $table->id();
            $table->string('active_rule_key')->default('VacationsLFTMX');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vacation_policy_settings');
    }
};
