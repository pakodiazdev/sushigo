<?php

use App\Exceptions\OrphanedEmployeeDataException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // employees.user_id is nullable with onDelete('set null'), so an employee can
        // be orphaned (e.g. its User was deleted). Dropping first_name/last_name would
        // permanently lose that employee's name with no way to recover it — abort and
        // require a human decision (link to a user, or accept the loss explicitly)
        // instead of silently discarding data.
        $orphanedCount = DB::table('employees')->whereNull('user_id')->count();

        if ($orphanedCount > 0) {
            throw new OrphanedEmployeeDataException(
                "Cannot drop employees.first_name/last_name: {$orphanedCount} employee(s) have no linked "
                .'user (user_id IS NULL) and would permanently lose their name. Link them to a user, '
                .'or explicitly handle their data, before running this migration.'
            );
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'last_name']);
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('first_name', 100)->nullable()->after('code');
            $table->string('last_name', 100)->nullable()->after('first_name');
        });
    }
};
