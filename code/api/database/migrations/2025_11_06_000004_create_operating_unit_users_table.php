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
        Schema::create('operating_unit_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete()
                ->comment('User reference');
            
            $table->foreignId('operating_unit_id')
                ->constrained('operating_units')
                ->cascadeOnDelete()
                ->comment('Operating unit reference');
            
            $table->enum('assignment_role', [
                'OWNER',
                'MANAGER',
                'CASHIER',
                'INVENTORY',
                'AUDITOR'
            ])->comment('Role within the operating unit');
            
            $table->boolean('is_active')->default(true)->comment('Assignment active status');
            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();

            $table->unique(['user_id', 'operating_unit_id'], 'unique_user_per_unit');
            $table->index(['operating_unit_id', 'is_active']);
            $table->index(['user_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('operating_unit_users');
    }
};
