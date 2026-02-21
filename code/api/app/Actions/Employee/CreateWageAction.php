<?php

namespace App\Actions\Employee;

use App\Models\Employee;
use App\Models\WageHistory;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CreateWageAction
{
    /**
     * Create a new WageHistory for the given employee, closing any open wage.
     *
     * @param Employee $employee
     * @param array $data
     * @return WageHistory
     */
    public function __invoke(Employee $employee, array $data): WageHistory
    {
        return DB::transaction(function () use ($employee, $data) {
            $open = WageHistory::where('employee_id', $employee->id)
                ->whereNull('effective_to')
                ->lockForUpdate()
                ->get();

            $newFrom = Carbon::parse($data['effective_from'])->startOfDay();

            foreach ($open as $o) {
                $o->update(['effective_to' => $newFrom->copy()->subDay()->toDateString()]);
            }

            $data['employee_id'] = $employee->id;

            return WageHistory::create($data);
        });
    }
}
