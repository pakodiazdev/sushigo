<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;

final class VariantSkuCollisionResponder
{
    private const CODE_CONSTRAINT = 'item_variants_code_unique';

    public function __construct(private readonly VariantSkuGenerator $generator) {}

    public function isCodeViolation(UniqueConstraintViolationException $exception): bool
    {
        return str_contains($exception->getMessage(), self::CODE_CONSTRAINT);
    }

    public function response(
        string $message,
        string $rejectedCode,
        string $itemName,
        string $variantName,
        string $uomCode,
    ): JsonResponse {
        return response()->json([
            'message' => $message,
            'errors' => ['code' => [$message]],
            'rejected_code' => $rejectedCode,
            'suggested_code' => $this->generator->suggest($itemName, $variantName, $uomCode),
        ], 422);
    }
}
