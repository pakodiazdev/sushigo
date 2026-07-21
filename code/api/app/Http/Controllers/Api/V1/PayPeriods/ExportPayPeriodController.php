<?php

namespace App\Http\Controllers\Api\V1\PayPeriods;

use App\Http\Controllers\Controller;
use App\Http\Requests\PayPeriods\ExportPayPeriodRequest;
use App\Models\PayPeriod;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * @OA\Get(
 *   path="/api/v1/pay-periods/{payPeriod}/export",
 *   summary="Export Closed Pay Period to CSV",
 *   description="Streams a CSV file with the per-employee pay breakdown of a closed pay period.",
 *   tags={"PayPeriods"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="payPeriod", in="path", required=true, @OA\Schema(type="string"), description="Public ID (ULID) of the pay period"),
 *   @OA\Parameter(name="format", in="query", required=false, @OA\Schema(type="string", enum={"csv"}), description="Export format"),
 *
 *   @OA\Response(response=200, description="CSV file"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Pay period not found"),
 *   @OA\Response(response=422, description="Pay period is not closed")
 * )
 */
class ExportPayPeriodController extends Controller
{
    private const HEADERS = [
        'code', 'name', 'base_pay', 'late_deductions', 'unpaid_leave_deductions',
        'overtime_pay', 'extra_day_pay', 'punctuality_bonus', 'holiday_pay', 'total_pay',
    ];

    public function __invoke(ExportPayPeriodRequest $request, PayPeriod $payPeriod): StreamedResponse
    {
        if (! $payPeriod->isClosed()) {
            throw ValidationException::withMessages([
                'status' => 'Solo se pueden exportar periodos cerrados.',
            ]);
        }

        $payPeriod->load('payPeriodEmployees.employee.user');

        $filename = "periodo-nomina-{$payPeriod->period_start->format('Y-m-d')}-{$payPeriod->period_end->format('Y-m-d')}.csv";

        return response()->streamDownload(function () use ($payPeriod) {
            $handle = fopen('php://output', 'w');

            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, self::HEADERS, ',', '"', '\\', "\r\n");

            foreach ($payPeriod->payPeriodEmployees as $payPeriodEmployee) {
                fputcsv($handle, [
                    $payPeriodEmployee->employee->code,
                    $payPeriodEmployee->employee->user?->name ?? '',
                    number_format((float) $payPeriodEmployee->base_pay, 2, '.', ''),
                    number_format((float) $payPeriodEmployee->late_deductions, 2, '.', ''),
                    number_format((float) $payPeriodEmployee->unpaid_leave_deductions, 2, '.', ''),
                    number_format((float) $payPeriodEmployee->overtime_pay, 2, '.', ''),
                    number_format((float) $payPeriodEmployee->extra_day_pay, 2, '.', ''),
                    number_format((float) $payPeriodEmployee->punctuality_bonus, 2, '.', ''),
                    number_format((float) $payPeriodEmployee->holiday_pay, 2, '.', ''),
                    number_format((float) $payPeriodEmployee->total_pay, 2, '.', ''),
                ], ',', '"', '\\', "\r\n");
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
