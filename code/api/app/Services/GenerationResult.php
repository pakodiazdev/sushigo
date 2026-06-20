<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Result returned by HolidayGeneratorService::generateForYear().
 */
final class GenerationResult
{
    public function __construct(
        public readonly int $generated,
        public readonly int $skipped,
        /** @var string[] */
        public readonly array $warnings,
    ) {}
}
