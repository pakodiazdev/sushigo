<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->string('name', 255)->comment('Manufacturer / commercial brand name');
            $table->boolean('is_active')->default(true)->comment('Whether this brand can be assigned to new Products');
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
        });

        // Partial unique index instead of a plain unique() column: name must
        // only be unique among non-deleted rows, matching StoreBrandRequest's
        // Rule::unique(...)->whereNull('deleted_at') — otherwise a deleted
        // brand's name could never be reused (Postgres doesn't exempt
        // soft-deleted rows from a plain unique constraint).
        DB::statement('create unique index brands_name_unique on brands (name) where deleted_at is null');
    }

    public function down(): void
    {
        Schema::dropIfExists('brands');
    }
};
