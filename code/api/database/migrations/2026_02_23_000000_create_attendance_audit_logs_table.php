<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('auditable_type', 100)->comment('Morph class of the audited model.');
            $table->unsignedBigInteger('auditable_id')->comment('Primary key of the audited model.');
            $table->enum('action', ['CREATE', 'UPDATE', 'DELETE'])->comment('Type of change applied.');
            $table->json('old_values')->nullable()->comment('Snapshot before the change. NULL for CREATE.');
            $table->json('new_values')->nullable()->comment('Snapshot after the change. NULL for DELETE.');
            $table->foreignId('user_id')
                ->constrained('users')
                ->restrictOnDelete();
            $table->text('reason')->nullable()->comment('Optional human explanation for the change.');
            $table->timestamp('created_at')->useCurrent();

            // Optimise polymorphic lookups: fetch all logs for a given auditable entity
            $table->index(['auditable_type', 'auditable_id'], 'audit_logs_auditable_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_audit_logs');
    }
};
