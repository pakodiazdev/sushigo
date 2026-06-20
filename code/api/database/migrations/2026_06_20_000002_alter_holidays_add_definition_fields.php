<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('holidays', function (Blueprint $table) {
            $table->foreignId('definition_id')
                ->nullable()
                ->constrained('holiday_definitions')
                ->nullOnDelete()
                ->after('id');
            $table->enum('type', ['obligatorio', 'asueto', 'opcional'])->nullable()->after('name');
            $table->boolean('is_auto_generated')->default(false)->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('holidays', function (Blueprint $table) {
            $table->dropForeign(['definition_id']);
            $table->dropColumn(['definition_id', 'type', 'is_auto_generated']);
        });
    }
};
