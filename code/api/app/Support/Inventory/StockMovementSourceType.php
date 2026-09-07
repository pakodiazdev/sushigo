<?php

declare(strict_types=1);

namespace App\Support\Inventory;

use App\Models\Receipt;
use App\Models\StockTransfer;
use Illuminate\Support\Str;

/**
 * Maps a Stock Movement's stored `related_type` FQCN to the short, stable token
 * exposed at the HTTP boundary (#574) — internal class names are never part of
 * the public contract.
 *
 * `tokenFor()` derives a token generically (snake-cased class basename) so any
 * future source document serializes without a code change. `KNOWN` is the
 * narrower set the `source_type` list filter accepts and can translate *back*
 * to a FQCN for the query; a token outside it fails validation rather than
 * silently matching nothing.
 */
final class StockMovementSourceType
{
    /** @var array<string, class-string> */
    public const KNOWN = [
        'receipt' => Receipt::class,
        'stock_transfer' => StockTransfer::class,
    ];

    public static function tokenFor(?string $relatedType): ?string
    {
        if ($relatedType === null || $relatedType === '') {
            return null;
        }

        return Str::snake(class_basename($relatedType));
    }

    public static function classFor(string $token): ?string
    {
        return self::KNOWN[$token] ?? null;
    }

    /**
     * @return list<string>
     */
    public static function tokens(): array
    {
        return array_keys(self::KNOWN);
    }
}
