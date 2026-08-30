<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\VariantSkuCollisionResponder;
use App\Support\VariantSkuGenerator;
use Illuminate\Database\UniqueConstraintViolationException;
use PDOException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class VariantSkuCollisionResponderTest extends TestCase
{
    #[Test]
    public function it_only_classifies_the_variant_code_constraint_as_a_sku_collision(): void
    {
        $responder = new VariantSkuCollisionResponder(new VariantSkuGenerator);

        $this->assertTrue($responder->isCodeViolation($this->exceptionFor('item_variants_code_unique')));
        $this->assertFalse($responder->isCodeViolation($this->exceptionFor('item_variants_barcode_unique')));
    }

    private function exceptionFor(string $constraint): UniqueConstraintViolationException
    {
        $previous = new PDOException("duplicate key value violates unique constraint \"{$constraint}\"");

        return new UniqueConstraintViolationException('pgsql', 'insert into item_variants', [], $previous);
    }
}
