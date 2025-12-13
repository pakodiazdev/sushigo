<?php

namespace App\Services\CashAdjustments;

use App\Models\CashExpense;
use App\Models\CashSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CashExpenseService
{
    /**
     * Register a new expense
     *
     * @param CashSession $session
     * @param string $tenderType
     * @param float $amount
     * @param string $category
     * @param string|null $vendor
     * @param string|null $reference
     * @param string|null $notes
     * @param int|null $cardTerminalId
     * @param int|null $bankAccountId
     * @param User $createdBy
     * @param string|null $incurredAt
     * @param array $meta
     * @return CashExpense
     * @throws \Exception
     */
    public function registerExpense(
        CashSession $session,
        string $tenderType,
        float $amount,
        string $category,
        ?string $vendor = null,
        ?string $reference = null,
        ?string $notes = null,
        ?int $cardTerminalId = null,
        ?int $bankAccountId = null,
        User $createdBy,
        ?string $incurredAt = null,
        array $meta = []
    ): CashExpense {
        // Validate tender-specific requirements
        $this->validateTenderRequirements($tenderType, $cardTerminalId, $bankAccountId);

        if ($amount <= 0) {
            throw new \Exception("Expense amount must be positive");
        }

        return CashExpense::create([
            'cash_session_id' => $session->id,
            'tender_type' => $tenderType,
            'amount' => $amount,
            'category' => $category,
            'vendor' => $vendor,
            'reference' => $reference,
            'notes' => $notes,
            'card_terminal_id' => $cardTerminalId,
            'bank_account_id' => $bankAccountId,
            'incurred_at' => $incurredAt ?? now(),
            'created_by' => $createdBy->id,
            'meta' => $meta,
        ]);
    }

    /**
     * Post an expense (mark as finalized)
     *
     * @param CashExpense $expense
     * @param User $user
     * @return CashExpense
     * @throws \Exception
     */
    public function postExpense(CashExpense $expense, User $user): CashExpense
    {
        if ($expense->isPosted()) {
            throw new \Exception("Expense is already posted");
        }

        $expense->posted_by = $user->id;
        $expense->posted_at = now();
        $expense->save();

        return $expense;
    }

    /**
     * Update expense (only if not posted)
     *
     * @param CashExpense $expense
     * @param array $data
     * @return CashExpense
     * @throws \Exception
     */
    public function updateExpense(CashExpense $expense, array $data): CashExpense
    {
        if ($expense->isPosted()) {
            throw new \Exception("Cannot update posted expense");
        }

        // Validate tender requirements if tender type is being updated
        if (isset($data['tender_type'])) {
            $this->validateTenderRequirements(
                $data['tender_type'],
                $data['card_terminal_id'] ?? $expense->card_terminal_id,
                $data['bank_account_id'] ?? $expense->bank_account_id
            );
        }

        $expense->update($data);

        return $expense;
    }

    /**
     * Delete an expense (only if not posted)
     *
     * @param CashExpense $expense
     * @return bool
     * @throws \Exception
     */
    public function deleteExpense(CashExpense $expense): bool
    {
        if ($expense->isPosted()) {
            throw new \Exception("Cannot delete posted expense");
        }

        return $expense->delete();
    }

    /**
     * Get expenses summary for a session
     *
     * @param CashSession $session
     * @return array
     */
    public function getSessionExpensesSummary(CashSession $session): array
    {
        $expenses = $session->expenses()->with(['cardTerminal', 'bankAccount', 'createdBy'])->get();

        $byCategory = $expenses->groupBy('category')->map(function ($items, $category) {
            return [
                'category' => $category,
                'count' => $items->count(),
                'total' => $items->sum('amount'),
            ];
        })->values();

        $byTenderType = $expenses->groupBy('tender_type')->map(function ($items, $tenderType) {
            return [
                'tender_type' => $tenderType,
                'count' => $items->count(),
                'total' => $items->sum('amount'),
            ];
        })->values();

        return [
            'session_id' => $session->id,
            'total_expenses' => $expenses->sum('amount'),
            'expenses_count' => $expenses->count(),
            'posted_count' => $expenses->filter(fn($e) => $e->isPosted())->count(),
            'draft_count' => $expenses->filter(fn($e) => !$e->isPosted())->count(),
            'by_category' => $byCategory,
            'by_tender_type' => $byTenderType,
        ];
    }

    /**
     * Get expense categories statistics for a date range
     *
     * @param int $cashRegisterId
     * @param string $fromDate
     * @param string $toDate
     * @return array
     */
    public function getCategoryStatistics(int $cashRegisterId, string $fromDate, string $toDate): array
    {
        $expenses = CashExpense::whereHas('cashSession', function ($query) use ($cashRegisterId, $fromDate, $toDate) {
            $query->where('cash_register_id', $cashRegisterId)
                ->whereBetween('operating_date', [$fromDate, $toDate]);
        })->posted()->get();

        $stats = $expenses->groupBy('category')->map(function ($items, $category) {
            return [
                'category' => $category,
                'count' => $items->count(),
                'total' => $items->sum('amount'),
                'average' => $items->avg('amount'),
                'min' => $items->min('amount'),
                'max' => $items->max('amount'),
            ];
        })->values();

        return [
            'cash_register_id' => $cashRegisterId,
            'period' => [
                'from' => $fromDate,
                'to' => $toDate,
            ],
            'total_expenses' => $expenses->sum('amount'),
            'total_count' => $expenses->count(),
            'categories' => $stats,
        ];
    }

    /**
     * Validate tender-specific requirements
     *
     * @param string $tenderType
     * @param int|null $cardTerminalId
     * @param int|null $bankAccountId
     * @throws \Exception
     */
    private function validateTenderRequirements(string $tenderType, ?int $cardTerminalId, ?int $bankAccountId): void
    {
        if ($tenderType === CashExpense::TENDER_CARD && !$cardTerminalId) {
            throw new \Exception("CARD tender requires card_terminal_id");
        }

        if ($tenderType === CashExpense::TENDER_TRANSFER && !$bankAccountId) {
            throw new \Exception("TRANSFER tender requires bank_account_id");
        }
    }
}
