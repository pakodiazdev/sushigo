<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\PurchasePresentationTemplate;
use App\Models\UnitOfMeasure;
use Illuminate\Support\Str;

/** Builds deterministic, semantic and historically unused template codes. */
class PurchasePresentationTemplateCodeGenerator
{
    private const MAX_LENGTH = 50;

    public function suggest(string $packageType, string|int|float $quantity, UnitOfMeasure $uom): string
    {
        $base = $this->fit($this->token($packageType).'_'.$this->normalizeQuantity($quantity));

        if (! $this->isOccupied($base)) {
            return $base;
        }

        $uomToken = $this->token($uom->code);
        $qualified = $uomToken === '' ? $base : $this->fit($base.'_'.$uomToken);
        if ($uomToken !== '' && ! $this->isOccupied($qualified)) {
            return $qualified;
        }

        for ($suffix = 2; ; $suffix++) {
            $tail = '_'.$suffix;
            $candidate = Str::substr($qualified, 0, self::MAX_LENGTH - Str::length($tail)).$tail;
            if (! $this->isOccupied($candidate)) {
                return $candidate;
            }
        }
    }

    private function normalizeQuantity(string|int|float $quantity): string
    {
        // The persisted column has scale 4. Formatting first makes 24, 24.0 and
        // 24.0000 equivalent, while trimming keeps the code operationally terse.
        $normalized = rtrim(rtrim(number_format((float) $quantity, 4, '.', ''), '0'), '.');

        return $normalized === '-0' ? '0' : $normalized;
    }

    private function token(string $value): string
    {
        $token = preg_replace('/[^A-Z0-9]+/', '_', Str::upper(Str::ascii($value))) ?? '';

        return trim($token, '_');
    }

    private function fit(string $candidate): string
    {
        return Str::substr($candidate, 0, self::MAX_LENGTH);
    }

    private function isOccupied(string $code): bool
    {
        // Historical non-reuse is intentional even though the partial unique
        // index permits an operator to enter a soft-deleted code manually.
        return PurchasePresentationTemplate::withTrashed()->where('code', $code)->exists();
    }
}
