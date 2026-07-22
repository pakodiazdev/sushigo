<?php

namespace App\Http\Requests\Concerns;

/**
 * String-to-native-type casts repeated across CashAdjustments FormRequests,
 * needed because numeric/boolean fields can arrive as strings (e.g. multipart
 * form-data or query-string input).
 */
trait CastsRequestFields
{
    protected function castToFloat(string $field): void
    {
        if ($this->has($field) && is_string($this->$field)) {
            $this->merge([$field => (float) $this->$field]);
        }
    }

    protected function castToBoolean(string $field): void
    {
        if ($this->has($field) && is_string($this->$field)) {
            $this->merge([$field => filter_var($this->$field, FILTER_VALIDATE_BOOLEAN)]);
        }
    }
}
