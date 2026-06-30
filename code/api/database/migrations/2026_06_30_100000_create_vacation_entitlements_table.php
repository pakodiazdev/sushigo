<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vacation_entitlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->smallInteger('year');
            $table->smallInteger('entitled_days');
            $table->smallInteger('used_days')->default(0);
            $table->string('rule_key', 64);
            $table->timestamps();

            $table->unique(['employee_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vacation_entitlements');
    }
};
