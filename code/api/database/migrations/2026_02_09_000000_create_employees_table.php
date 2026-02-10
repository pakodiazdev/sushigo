<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null');
            $table->string('code', 20)->unique()->comment('Código único (EMP-001)');
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->enum('role', ['MANAGER', 'COOK', 'KITCHEN_ASSISTANT', 'DELIVERY_DRIVER']);
            $table->boolean('is_active')->default(true);
            $table->json('meta')->nullable()->comment('Additional employee metadata');
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
            $table->index('role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
