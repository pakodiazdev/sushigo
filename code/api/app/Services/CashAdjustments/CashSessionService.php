<?php

namespace App\Services\CashAdjustments;

use App\Exceptions\CashSessionAlreadyPostedException;
use App\Exceptions\DuplicateCashSessionException;
use App\Models\CashRegister;
use App\Models\CashSession;
use Illuminate\Support\Facades\DB;

class CashSessionService
{
    /**
     * Open a new cash session for a register
     *
     * @throws DuplicateCashSessionException
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
            throw new DuplicateCashSessionException("Session already exists for register {$cashRegister->code} on {$operatingDate}");
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
     */
    public function calculateClosingBalance(CashSession $session): float
    {
        return $session->calculateClosingBalance();
    }

    /**
     * Update closing balance and recalculate
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
     * @throws CashSessionAlreadyPostedException
     */
    public function postSession(CashSession $session): CashSession
    {
        if ($session->isPosted()) {
            throw new CashSessionAlreadyPostedException('Session is already posted');
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
     */
    public function getSessionSummary(CashSession $session): array
    {
        // Load relationships if not already loaded
        if (! $session->relationLoaded('cashRegister')) {
            $session->load('cashRegister');
        }

        $adjustments = $session->adjustments()->with(['lines.cardTerminal', 'lines.bankAccount'])->get();
        $expenses = $session->expenses()->with(['cardTerminal', 'bankAccount'])->get();

        // Income totals (INFLOW adjustment lines)
        $incomeLines = $adjustments->where('direction', 'INFLOW')->flatMap->lines;
        [$incomes, $totalIncomes] = $this->tallyByTenderType($incomeLines);

        // Expense totals (OUTFLOW adjustment lines + expenses)
        $outflowLines = $adjustments->where('direction', 'OUTFLOW')->flatMap->lines;
        [$expensesData, $totalExpenses] = $this->tallyByTenderType($outflowLines->concat($expenses));

        return [
            'session' => $session,
            'incomes' => array_values($incomes),
            'expenses' => array_values($expensesData),
            'closing_balance' => (string) $session->closing_balance,
            'total_incomes' => (string) number_format($totalIncomes, 2, '.', ''),
            'total_expenses' => (string) number_format($totalExpenses, 2, '.', ''),
            'current_balance' => (string) number_format($session->calculateCurrentBalance(), 2, '.', ''),
            // Debug info - temporal
            '_debug' => [
                'opening_balance' => (string) $session->opening_balance,
                'opening_balance_type' => gettype($session->opening_balance),
                'calculated_current' => $session->calculateCurrentBalance(),
            ],
        ];
    }

    /**
     * Group items with a tender_type/amount pair by tender type, summing amounts and counts.
     *
     * @param  iterable<object{tender_type: string, amount: mixed}>  $items
     * @return array{0: array<string, array{tender_type: string, amount: float, count: int}>, 1: float}
     */
    private function tallyByTenderType(iterable $items): array
    {
        $tally = [];
        $total = 0.0;

        foreach ($items as $item) {
            $tenderType = $item->tender_type;
            $amount = (float) $item->amount;

            $tally[$tenderType] ??= [
                'tender_type' => $tenderType,
                'amount' => 0,
                'count' => 0,
            ];

            $tally[$tenderType]['amount'] += $amount;
            $tally[$tenderType]['count']++;
            $total += $amount;
        }

        return [$tally, $total];
    }
}
