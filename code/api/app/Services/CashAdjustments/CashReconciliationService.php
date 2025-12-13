<?php

namespace App\Services\CashAdjustments;

use App\Models\CashSession;
use App\Models\CashRegister;
use Illuminate\Support\Collection;

class CashReconciliationService
{
    /**
     * Calculate variance between expected and actual closing balance
     *
     * @param CashSession $session
     * @param float $actualClosingBalance
     * @return array
     */
    public function getVariance(CashSession $session, float $actualClosingBalance): array
    {
        $expectedClosing = $session->calculateClosingBalance();
        $variance = $actualClosingBalance - $expectedClosing;
        $variancePercent = $expectedClosing > 0 ? ($variance / $expectedClosing) * 100 : 0;

        return [
            'session_id' => $session->id,
            'cash_register' => $session->cashRegister->code,
            'operating_date' => $session->operating_date->format('Y-m-d'),
            'opening_balance' => (float) $session->opening_balance,
            'expected_closing' => $expectedClosing,
            'actual_closing' => $actualClosingBalance,
            'variance' => $variance,
            'variance_percent' => round($variancePercent, 2),
            'status' => $this->getVarianceStatus($variance),
        ];
    }

    /**
     * Generate daily summary for a session
     *
     * @param CashSession $session
     * @return array
     */
    public function generateDailySummary(CashSession $session): array
    {
        // Only include posted transactions
        $adjustments = $session->adjustments()->posted()->with('lines')->get();
        $expenses = $session->expenses()->posted()->with(['cardTerminal', 'bankAccount'])->get();

        // Calculate adjustment totals
        $inflowAdjustments = $adjustments->where('direction', 'INFLOW');
        $outflowAdjustments = $adjustments->where('direction', 'OUTFLOW');

        $inflowTotal = $inflowAdjustments->sum(fn($adj) => $adj->getTotalAmount());
        $outflowTotal = $outflowAdjustments->sum(fn($adj) => $adj->getTotalAmount());

        // Calculate tender breakdown for adjustments
        $adjustmentTenderBreakdown = $this->getTenderBreakdown($adjustments);

        // Calculate tender breakdown for expenses
        $expenseTenderBreakdown = $expenses->groupBy('tender_type')->map(fn($items) => [
            'count' => $items->count(),
            'total' => $items->sum('amount'),
        ]);

        // Calculate expense category breakdown
        $expenseCategoryBreakdown = $expenses->groupBy('category')->map(fn($items) => [
            'count' => $items->count(),
            'total' => $items->sum('amount'),
        ]);

        $expectedClosing = $session->calculateClosingBalance();

        return [
            'session' => [
                'id' => $session->id,
                'cash_register_id' => $session->cash_register_id,
                'cash_register_code' => $session->cashRegister->code,
                'cash_register_name' => $session->cashRegister->name,
                'operating_date' => $session->operating_date->format('Y-m-d'),
                'status' => $session->status,
            ],
            'balances' => [
                'opening' => (float) $session->opening_balance,
                'expected_closing' => $expectedClosing,
                'recorded_closing' => (float) $session->closing_balance,
            ],
            'adjustments' => [
                'inflow' => [
                    'count' => $inflowAdjustments->count(),
                    'total' => $inflowTotal,
                    'by_type' => $inflowAdjustments->groupBy('type')->map(fn($items) => $items->count()),
                ],
                'outflow' => [
                    'count' => $outflowAdjustments->count(),
                    'total' => $outflowTotal,
                    'by_type' => $outflowAdjustments->groupBy('type')->map(fn($items) => $items->count()),
                ],
                'net' => $inflowTotal - $outflowTotal,
                'tender_breakdown' => $adjustmentTenderBreakdown,
            ],
            'expenses' => [
                'total' => $expenses->sum('amount'),
                'count' => $expenses->count(),
                'tender_breakdown' => $expenseTenderBreakdown,
                'category_breakdown' => $expenseCategoryBreakdown,
            ],
            'reconciliation' => [
                'calculated' => ($session->opening_balance ?? 0) + $inflowTotal - $outflowTotal - $expenses->sum('amount'),
                'variance' => ($session->closing_balance ?? 0) - $expectedClosing,
            ],
        ];
    }

    /**
     * Generate summary for multiple sessions (e.g., weekly or monthly)
     *
     * @param Collection $sessions
     * @return array
     */
    public function generatePeriodSummary(Collection $sessions): array
    {
        if ($sessions->isEmpty()) {
            return [
                'sessions_count' => 0,
                'total_adjustments' => 0,
                'total_expenses' => 0,
            ];
        }

        $totalInflow = 0;
        $totalOutflow = 0;
        $totalExpenses = 0;
        $totalVariance = 0;

        foreach ($sessions as $session) {
            // Only include posted transactions
            $adjustments = $session->adjustments()->posted()->get();
            $expenses = $session->expenses()->posted()->get();

            $totalInflow += $adjustments->where('direction', 'INFLOW')->sum(fn($adj) => $adj->getTotalAmount());
            $totalOutflow += $adjustments->where('direction', 'OUTFLOW')->sum(fn($adj) => $adj->getTotalAmount());
            $totalExpenses += $expenses->sum('amount');

            $expected = $session->calculateClosingBalance();
            $totalVariance += ($session->closing_balance ?? 0) - $expected;
        }

        return [
            'period' => [
                'from' => $sessions->min('operating_date')->format('Y-m-d'),
                'to' => $sessions->max('operating_date')->format('Y-m-d'),
            ],
            'sessions_count' => $sessions->count(),
            'totals' => [
                'inflow_adjustments' => $totalInflow,
                'outflow_adjustments' => $totalOutflow,
                'expenses' => $totalExpenses,
                'net_movement' => $totalInflow - $totalOutflow - $totalExpenses,
            ],
            'reconciliation' => [
                'total_variance' => $totalVariance,
                'average_variance' => $sessions->count() > 0 ? $totalVariance / $sessions->count() : 0,
                'sessions_with_variance' => $sessions->filter(function ($session) {
                    $expected = $session->calculateClosingBalance();
                    return abs(($session->closing_balance ?? 0) - $expected) > 0.01;
                })->count(),
            ],
        ];
    }

    /**
     * Get reconciliation report for a cash register over a date range
     *
     * @param CashRegister $cashRegister
     * @param string $fromDate
     * @param string $toDate
     * @return array
     */
    public function getReconciliationReport(CashRegister $cashRegister, string $fromDate, string $toDate): array
    {
        $sessions = CashSession::where('cash_register_id', $cashRegister->id)
            ->whereBetween('operating_date', [$fromDate, $toDate])
            ->with(['adjustments.lines', 'expenses'])
            ->orderBy('operating_date')
            ->get();

        $dailySummaries = $sessions->map(fn($session) => $this->generateDailySummary($session));
        $periodSummary = $this->generatePeriodSummary($sessions);

        return [
            'cash_register' => [
                'id' => $cashRegister->id,
                'code' => $cashRegister->code,
                'name' => $cashRegister->name,
                'type' => $cashRegister->type,
            ],
            'period_summary' => $periodSummary,
            'daily_summaries' => $dailySummaries,
        ];
    }

    /**
     * Get tender breakdown from adjustments
     *
     * @param Collection $adjustments
     * @return array
     */
    private function getTenderBreakdown(Collection $adjustments): array
    {
        $breakdown = [
            'CASH' => ['count' => 0, 'total' => 0],
            'CARD' => ['count' => 0, 'total' => 0],
            'TRANSFER' => ['count' => 0, 'total' => 0],
        ];

        foreach ($adjustments as $adjustment) {
            foreach ($adjustment->lines as $line) {
                $breakdown[$line->tender_type]['count']++;
                $breakdown[$line->tender_type]['total'] += (float) $line->amount;
            }
        }

        return $breakdown;
    }

    /**
     * Get variance status classification
     *
     * @param float $variance
     * @return string
     */
    private function getVarianceStatus(float $variance): string
    {
        $absVariance = abs($variance);

        if ($absVariance < 1) {
            return 'OK';
        } elseif ($absVariance < 10) {
            return 'WARNING';
        } else {
            return 'CRITICAL';
        }
    }
}
