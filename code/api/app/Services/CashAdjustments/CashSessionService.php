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

        // Calculate income totals (INFLOW adjustments)
        $incomes = [];
        $totalIncomes = 0;

        foreach ($adjustments->where('direction', 'INFLOW') as $adjustment) {
            foreach ($adjustment->lines as $line) {
                $tenderType = $line->tender_type;

                if (! isset($incomes[$tenderType])) {
                    $incomes[$tenderType] = [
                        'tender_type' => $tenderType,
                        'amount' => 0,
                        'count' => 0,
                    ];
                }

                $incomes[$tenderType]['amount'] += (float) $line->amount;
                $incomes[$tenderType]['count']++;
                $totalIncomes += (float) $line->amount;
            }
        }

        // Calculate expense totals (OUTFLOW adjustments + expenses)
        $expensesData = [];
        $totalExpenses = 0;

        // Add OUTFLOW adjustments as expenses
        foreach ($adjustments->where('direction', 'OUTFLOW') as $adjustment) {
            foreach ($adjustment->lines as $line) {
                $tenderType = $line->tender_type;

                if (! isset($expensesData[$tenderType])) {
                    $expensesData[$tenderType] = [
                        'tender_type' => $tenderType,
                        'amount' => 0,
                        'count' => 0,
                    ];
                }

                $expensesData[$tenderType]['amount'] += (float) $line->amount;
                $expensesData[$tenderType]['count']++;
                $totalExpenses += (float) $line->amount;
            }
        }

        // Add expenses
        foreach ($expenses as $expense) {
            $tenderType = $expense->tender_type;

            if (! isset($expensesData[$tenderType])) {
                $expensesData[$tenderType] = [
                    'tender_type' => $tenderType,
                    'amount' => 0,
                    'count' => 0,
                ];
            }

            $expensesData[$tenderType]['amount'] += (float) $expense->amount;
            $expensesData[$tenderType]['count']++;
            $totalExpenses += (float) $expense->amount;
        }

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
}
