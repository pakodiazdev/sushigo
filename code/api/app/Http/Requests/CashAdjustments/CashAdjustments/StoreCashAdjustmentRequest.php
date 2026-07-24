<?php

namespace App\Http\Requests\CashAdjustments\CashAdjustments;

use App\Http\Requests\Concerns\SharesValidationMessages;
use App\Http\Requests\Concerns\ValidatesTenderTypeReference;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * @OA\Schema(
 *   schema="StoreCashAdjustmentRequest",
 *   required={"cash_session_id", "type", "direction", "lines"},
 *
 *   @OA\Property(property="cash_session_id", type="integer", example=1, description="Cash Session ID"),
 *   @OA\Property(property="source_system", type="string", maxLength=100, example="POS", description="Source system name", nullable=true),
 *   @OA\Property(property="type", type="string", enum={"EXTERNAL_IMPORT", "CORRECTION"}, example="EXTERNAL_IMPORT", description="Adjustment type"),
 *   @OA\Property(property="direction", type="string", enum={"INFLOW", "OUTFLOW"}, example="INFLOW", description="Cash flow direction"),
 *   @OA\Property(property="notes", type="string", maxLength=1000, example="Daily sales import", description="Adjustment notes", nullable=true),
 *   @OA\Property(property="meta", type="object", example={"import_id": "12345"}, description="Additional metadata", nullable=true),
 *   @OA\Property(
 *     property="lines",
 *     type="array",
 *     description="Adjustment lines by tender type",
 *
 *     @OA\Items(
 *       type="object",
 *       required={"tender_type", "amount"},
 *
 *       @OA\Property(property="tender_type", type="string", enum={"CASH", "CARD", "TRANSFER"}, example="CASH", description="Tender type"),
 *       @OA\Property(property="amount", type="number", format="decimal", example=500.00, description="Line amount"),
 *       @OA\Property(property="currency", type="string", example="MXN", description="Currency code (default: MXN)"),
 *       @OA\Property(property="card_terminal_id", type="integer", example=1, description="Terminal ID (required for CARD)", nullable=true),
 *       @OA\Property(property="bank_account_id", type="integer", example=1, description="Bank account ID (required for TRANSFER)", nullable=true),
 *       @OA\Property(property="reference", type="string", maxLength=255, example="TXN-123", description="Transaction reference", nullable=true),
 *       @OA\Property(property="meta", type="object", example={"tip": 50}, description="Line metadata", nullable=true),
 *     )
 *   ),
 * )
 */
class StoreCashAdjustmentRequest extends FormRequest
{
    use SharesValidationMessages;
    use ValidatesTenderTypeReference;

    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\CashAdjustment::class);
    }

    public function rules(): array
    {
        return [
            'cash_session_id' => 'required|integer|exists:cash_sessions,id',
            'source_system' => 'nullable|string|max:100',
            'type' => 'required|in:EXTERNAL_IMPORT,CORRECTION',
            'direction' => 'required|in:INFLOW,OUTFLOW',
            'notes' => 'nullable|string|max:1000',
            'meta' => 'nullable|array',

            'lines' => 'required|array|min:1',
            'lines.*.tender_type' => 'required|in:CASH,CARD,TRANSFER',
            'lines.*.amount' => 'required|numeric|min:0.01|max:999999.99',
            'lines.*.currency' => 'sometimes|string|size:3',
            'lines.*.card_terminal_id' => 'nullable|integer|exists:cash_terminals,id',
            'lines.*.bank_account_id' => 'nullable|integer|exists:bank_accounts,id',
            'lines.*.reference' => 'nullable|string|max:255',
            'lines.*.meta' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        $messages = $this->sharedMessages([
            'cash_session_id.required',
            'type.required',
            'direction.required',
            'direction.in',
            'lines.required',
            'lines.min',
            'lines.*.tender_type.required',
            'lines.*.tender_type.in',
            'lines.*.amount.required',
            'lines.*.amount.min',
        ]);

        $messages['type.in'] = 'El tipo debe ser EXTERNAL_IMPORT o CORRECTION';

        return $messages;
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if (! $this->has('lines')) {
                return;
            }

            foreach ($this->input('lines', []) as $index => $line) {
                $this->requireTenderTypeReference(
                    $validator,
                    $line['tender_type'] ?? null,
                    $line['card_terminal_id'] ?? null,
                    $line['bank_account_id'] ?? null,
                    "lines.{$index}.card_terminal_id",
                    "lines.{$index}.bank_account_id"
                );
            }
        });
    }

    public function prepareForValidation(): void
    {
        if ($this->has('lines') && is_array($this->lines)) {
            $lines = collect($this->lines)->map(function ($line) {
                if (isset($line['amount']) && is_string($line['amount'])) {
                    $line['amount'] = (float) $line['amount'];
                }

                return $line;
            })->toArray();

            $this->merge(['lines' => $lines]);
        }
    }
}
