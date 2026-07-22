<?php

namespace App\Services\CashAdjustments;

use App\DataTransferObjects\CashAdjustments\RegisterExpenseData;
use App\Exceptions\CashExpenseAlreadyPostedException;
use App\Exceptions\InvalidCashExpenseException;
use App\Models\CashExpense;
use App\Models\CashSession;
use App\Models\User;

class CashExpenseService
{
    /**
     * Register a new expense
     *
     * @throws InvalidCashExpenseException
     */
    public function registerExpense(RegisterExpenseData $data): CashExpense
    {
        // Validate tender-specific requirements
        $this->validateTenderRequirements($data->tenderType, $data->cardTerminalId, $data->bankAccountId);

        if ($data->amount <= 0) {
            throw new InvalidCashExpenseException('Expense amount must be positive');
        }

        return CashExpense::create([
            'cash_session_id' => $data->session->id,
            'tender_type' => $data->tenderType,
            'amount' => $data->amount,
            'category' => $data->category,
            'vendor' => $data->vendor,
            'reference' => $data->reference,
            'notes' => $data->notes,
            'card_terminal_id' => $data->cardTerminalId,
            'bank_account_id' => $data->bankAccountId,
            'incurred_at' => $data->incurredAt ?? now(),
            'created_by' => $data->createdBy->id,
            'meta' => $data->meta,
        ]);
    }

    /**
     * Post an expense (mark as finalized)
     *
     * @throws CashExpenseAlreadyPostedException
     */
    public function postExpense(CashExpense $expense, User $user): CashExpense
    {
        if ($expense->isPosted()) {
            throw new CashExpenseAlreadyPostedException('Expense is already posted');
        }

        $expense->posted_by = $user->id;
        $expense->posted_at = now();
        $expense->save();

        return $expense;
    }

    /**
     * Update expense (only if not posted)
     *
     * @throws CashExpenseAlreadyPostedException
     * @throws InvalidCashExpenseException
     */
    public function updateExpense(CashExpense $expense, array $data): CashExpense
    {
        if ($expense->isPosted()) {
            throw new CashExpenseAlreadyPostedException('Cannot update posted expense');
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
     * @throws CashExpenseAlreadyPostedException
     */
    public function deleteExpense(CashExpense $expense): bool
    {
        if ($expense->isPosted()) {
            throw new CashExpenseAlreadyPostedException('Cannot delete posted expense');
        }

        return $expense->delete();
    }

    /**
     * Get expenses summary for a session
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
            'posted_count' => $expenses->filter(fn ($e) => $e->isPosted())->count(),
            'draft_count' => $expenses->filter(fn ($e) => ! $e->isPosted())->count(),
            'by_category' => $byCategory,
            'by_tender_type' => $byTenderType,
        ];
    }

    /**
     * Get expense categories statistics for a date range
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
     * @throws InvalidCashExpenseException
     */
    private function validateTenderRequirements(string $tenderType, ?int $cardTerminalId, ?int $bankAccountId): void
    {
        if ($tenderType === CashExpense::TENDER_CARD && ! $cardTerminalId) {
            throw new InvalidCashExpenseException('CARD tender requires card_terminal_id');
        }

        if ($tenderType === CashExpense::TENDER_TRANSFER && ! $bankAccountId) {
            throw new InvalidCashExpenseException('TRANSFER tender requires bank_account_id');
        }
    }
}
