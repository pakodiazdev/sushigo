<?php

namespace App\Actions\Attendances;

use App\Models\Attendance;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Apply the same overtime decision to a batch of attendances.
 *
 * Delegates each attendance to RecordOvertimeDecisionAction, which keeps its own
 * DB transaction and the per-employee lockForUpdate() for LFT_PROPORTIONAL. A
 * failure on one attendance (e.g. already decided) is captured per-item instead
 * of aborting the rest of the batch.
 *
 * @see #249
 */
class RecordBulkOvertimeDecisionAction
{
    public function __construct(private readonly RecordOvertimeDecisionAction $recordDecision) {}

    /**
     * @param  Collection<int, Attendance>  $attendances  Already-resolved attendances, in request order
     * @param  array{authorize: bool, valuation_method?: string, agreed_rate?: float, agreed_factor?: float, reason?: string}  $data  Validated decision data (without attendance_ids)
     * @return array<int, array{attendance_id: string, success: bool, attendance?: Attendance, error?: string}>
     */
    public function __invoke(Collection $attendances, array $data, User $decidedBy): array
    {
        return $attendances
            ->map(function (Attendance $attendance) use ($data, $decidedBy) {
                try {
                    $updated = ($this->recordDecision)($attendance, $data, $decidedBy);

                    return [
                        'attendance_id' => $attendance->public_id,
                        'success' => true,
                        'attendance' => $updated,
                    ];
                } catch (ValidationException $exception) {
                    return [
                        'attendance_id' => $attendance->public_id,
                        'success' => false,
                        'error' => collect($exception->errors())->flatten()->first() ?? $exception->getMessage(),
                    ];
                }
            })
            ->values()
            ->all();
    }
}
