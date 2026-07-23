<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Validation\Validator;

trait ValidatesTenderTypeReference
{
    /**
     * Requires a card terminal reference for CARD tender type and a bank
     * account reference for TRANSFER, adding a validation error under the
     * given field path when the reference is missing.
     */
    protected function requireTenderTypeReference(
        Validator $validator,
        ?string $tenderType,
        mixed $cardTerminalId,
        mixed $bankAccountId,
        string $cardField = 'card_terminal_id',
        string $bankField = 'bank_account_id'
    ): void {
        if ($tenderType === 'CARD' && empty($cardTerminalId)) {
            $validator->errors()->add(
                $cardField,
                'El terminal de tarjeta es requerido para tender tipo CARD'
            );
        }

        if ($tenderType === 'TRANSFER' && empty($bankAccountId)) {
            $validator->errors()->add(
                $bankField,
                'La cuenta bancaria es requerida para tender tipo TRANSFER'
            );
        }
    }
}
