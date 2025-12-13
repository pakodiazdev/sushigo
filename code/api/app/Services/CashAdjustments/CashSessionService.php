<?php

namespace App\Services\CashAdjustments;

use App\Models\CashSession;
use App\Models\CashRegister;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CashSessionService
{
    /**
     * Open a new cash session for a register
     *
     * @param CashRegister $cashRegister
     * @param string $operatingDate
     * @param float|null $openingBalance
     * @param array $meta
     * @return CashSession
     * @throws \Exception
     */
    public function openSession(
        CashRegister $cashRegister,
        string $operatingDate,
        ?float $openingBalance = null,
        array $meta = []
    ): CashSession {
        // Check if session already exists for this date
        $existing = CashSession::where('cash_register_id', $cashRegister->id)
            ->where('operating_date', $operatingDate)
            ->first();

        if ($existing) {
            throw new \Exception("Session already exists for register {$cashRegister->code} on {$operatingDate}");
        }

        // If no opening balance provided, use previous day's closing balance
        if ($openingBalance === null) {
            $previousSession = CashSession::where('cash_register_id', $cashRegister->id)
                ->where('operating_date', '<', $operatingDate)
                ->where('status', CashSession::STATUS_POSTED)
                ->orderBy('operating_date', 'desc')
                ->first();

            $openingBalance = $previousSession ? (float) $previousSession->closing_balance : 0.0;
        }

        return CashSession::create([
            'cash_register_id' => $cashRegister->id,
            'operating_date' => $operatingDate,
            'status' => CashSession::STATUS_DRAFT,
            'opening_balance' => $openingBalance,
            'closing_balance' => $openingBalance, // Initially same as opening
            'meta' => $meta,
        ]);
    }

    /**
     * Calculate closing balance for a session
     *
     * @param CashSession $session
     * @return float
     */
    public function calculateClosingBalance(CashSession $session): float
    {
        return $session->calculateClosingBalance();
    }

    /**
     * Update closing balance and recalculate
     *
     * @param CashSession $session
     * @return CashSession
     */
    public function updateClosingBalance(CashSession $session): CashSession
    {
        $session->closing_balance = $this->calculateClosingBalance($session);
        $session->save();

        return $session;
    }

    /**
     * Post a session (mark as finalized)
     *
     * @param CashSession $session
     * @return CashSession
     * @throws \Exception
     */
    public function postSession(CashSession $session): CashSession
    {
        if ($session->isPosted()) {
            throw new \Exception("Session is already posted");
        }

        DB::beginTransaction();
        try {
            // Update closing balance
            $session->closing_balance = $this->calculateClosingBalance($session);
            $session->status = CashSession::STATUS_POSTED;
            $session->save();

            DB::commit();
            return $session;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get session summary with all totals
     *
     * @param CashSession $session
     * @return array
     */
    public function getSessionSummary(CashSession $session): array
    {
        $adjustments = $session->adjustments()->with('lines')->get();
        $expenses = $session->expenses;

        // Calculate adjustment totals by direction
        $inflowTotal = $adjustments
            ->where('direction', 'INFLOW')
            ->sum(fn($adj) => $adj->lines->sum('amount'));

        $outflowTotal = $adjustments
            ->where('direction', 'OUTFLOW')
            ->sum(fn($adj) => $adj->lines->sum('amount'));

        // Calculate totals by tender type
        $tenderTotals = [
            'CASH' => 0,
            'CARD' => 0,
            'TRANSFER' => 0,
        ];

        foreach ($adjustments as $adjustment) {
            foreach ($adjustment->lines as $line) {
                $tenderTotals[$line->tender_type] += (float) $line->amount;
            }
        }

        // Calculate expense totals
        $expensesTotal = $expenses->sum('amount');
        $expensesByCategory = $expenses->groupBy('category')->map(fn($items) => $items->sum('amount'));

        return [
            'session_id' => $session->id,
            'cash_register' => $session->cashRegister->code,
            'operating_date' => $session->operating_date->format('Y-m-d'),
            'status' => $session->status,
            'opening_balance' => (float) $session->opening_balance,
            'closing_balance' => (float) $session->closing_balance,
            'adjustments' => [
                'inflow_total' => $inflowTotal,
                'outflow_total' => $outflowTotal,
                'net' => $inflowTotal - $outflowTotal,
                'count' => $adjustments->count(),
            ],
            'expenses' => [
                'total' => $expensesTotal,
                'by_category' => $expensesByCategory,
                'count' => $expenses->count(),
            ],
            'tender_totals' => $tenderTotals,
            'variance' => ($session->opening_balance + $inflowTotal - $outflowTotal - $expensesTotal) - $session->closing_balance,
        ];
    }

    /**
     * Get or create today's session for a register
     *
     * @param CashRegister $cashRegister
     * @param string|null $date
     * @return CashSession
     */
    public function getOrCreateTodaySession(CashRegister $cashRegister, ?string $date = null): CashSession
    {
        $date = $date ?? Carbon::today()->format('Y-m-d');

        $session = CashSession::where('cash_register_id', $cashRegister->id)
            ->where('operating_date', $date)
            ->first();

        if (!$session) {
            $session = $this->openSession($cashRegister, $date);
        }

        return $session;
    }
}
