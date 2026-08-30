<?php

declare(strict_types=1);

namespace App\Support;

use App\Exceptions\VariantSkuExhaustedException;
use App\Models\ItemVariant;
use Illuminate\Support\Str;

/** Builds deterministic, contextual and historically unused ItemVariant SKUs. */
class VariantSkuGenerator
{
    public const MAX_LENGTH = 100;

    private const PREFIX_LENGTH = 3;

    private const FALLBACK_PREFIX = 'ITEM';

    private const COLLISION_PADDING = 3;

    private const MAX_SEQUENTIAL_ATTEMPTS = 100;

    private const FALLBACK_ATTEMPTS = 10;

    public function suggest(string $productName, string $variantName, string $uomCode): string
    {
        $stem = self::deriveStem($productName, $variantName, $uomCode);

        if (! $this->isOccupied($stem)) {
            return $stem;
        }

        $sequentialCandidates = array_map(
            fn (int $suffix): string => self::withSuffix($stem, $suffix),
            range(2, self::MAX_SEQUENTIAL_ATTEMPTS + 1),
        );
        $candidate = $this->firstAvailable($sequentialCandidates);
        if ($candidate !== null) {
            return $candidate;
        }

        $fallbackCandidates = array_map(
            fn (int $attempt): string => self::withTokenSuffix(
                $stem,
                strtoupper(substr(hash('sha256', $stem.'|'.$attempt), 0, 10)),
            ),
            range(1, self::FALLBACK_ATTEMPTS),
        );

        return $this->firstAvailable($fallbackCandidates)
            ?? throw new VariantSkuExhaustedException('Unable to generate an available Variant SKU.');
    }

    public static function derivePrefix(string $productName): string
    {
        $normalized = self::token($productName);
        $prefix = Str::substr($normalized, 0, self::PREFIX_LENGTH);

        return (Str::length($prefix) < self::PREFIX_LENGTH ? self::FALLBACK_PREFIX : $prefix).'-';
    }

    public static function deriveStem(string $productName, string $variantName, string $uomCode): string
    {
        $uom = self::token($uomCode);
        $descriptor = self::token($variantName);

        if ($descriptor === '1'.$uom || $descriptor === '') {
            $descriptor = $uom;
        } elseif ($uom !== '' && ! Str::endsWith($descriptor, $uom)) {
            $descriptor .= '-'.$uom;
        }

        return Str::substr(self::derivePrefix($productName).$descriptor, 0, self::MAX_LENGTH);
    }

    public static function withSuffix(string $stem, int $suffix): string
    {
        return self::withTokenSuffix(
            $stem,
            str_pad((string) $suffix, self::COLLISION_PADDING, '0', STR_PAD_LEFT),
        );
    }

    private static function withTokenSuffix(string $stem, string $token): string
    {
        $tail = '-'.$token;

        return Str::substr($stem, 0, self::MAX_LENGTH - Str::length($tail)).$tail;
    }

    private static function token(string $value): string
    {
        return preg_replace('/[^A-Z0-9]+/', '', Str::upper(Str::ascii($value))) ?? '';
    }

    private function isOccupied(string $code): bool
    {
        return ItemVariant::withTrashed()->where('code', $code)->exists();
    }

    /** @param list<string> $candidates */
    private function firstAvailable(array $candidates): ?string
    {
        $occupied = array_fill_keys(
            ItemVariant::withTrashed()->whereIn('code', $candidates)->pluck('code')->all(),
            true,
        );

        foreach ($candidates as $candidate) {
            if (! isset($occupied[$candidate])) {
                return $candidate;
            }
        }

        return null;
    }
}
