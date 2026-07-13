<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The original enum('type', ['EARNED', 'PAID', 'EXPIRED', 'TRANSFERRED']) is enforced
        // via a Postgres CHECK constraint that keeps its auto-generated name across the rename
        // below, so it must be dropped before movement_type can hold the full
        // OvertimeMovementType set (EARNED|USED|PAID|ADJUSTMENT).
        DB::statement('ALTER TABLE overtime_bank_movements DROP CONSTRAINT IF EXISTS overtime_bank_movements_type_check');

        Schema::table('overtime_bank_movements', function (Blueprint $table) {
            $table->renameColumn('type', 'movement_type');
            $table->string('origin')->default('AUTO')->after('movement_type');
            $table->string('valuation_method')->nullable()->after('minutes');
            $table->decimal('applied_rate', 8, 2)->nullable()->after('valuation_method');
            $table->decimal('amount', 10, 2)->nullable()->after('applied_rate');
            $table->foreignId('authorized_by')->nullable()->after('amount')->constrained('users')->nullOnDelete();
            $table->dateTime('authorized_at')->nullable()->after('authorized_by');
            $table->string('reason')->nullable()->after('authorized_at');
        });
    }

    public function down(): void
    {
        Schema::table('overtime_bank_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('authorized_by');
            $table->dropColumn(['origin', 'valuation_method', 'applied_rate', 'amount', 'authorized_at', 'reason']);
            $table->renameColumn('movement_type', 'type');
        });

        DB::statement("ALTER TABLE overtime_bank_movements ADD CONSTRAINT overtime_bank_movements_type_check CHECK (type IN ('EARNED', 'PAID', 'EXPIRED', 'TRANSFERRED'))");
    }
};
