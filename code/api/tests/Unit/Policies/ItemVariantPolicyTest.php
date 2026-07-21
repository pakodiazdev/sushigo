<?php

namespace Tests\Unit\Policies;

use App\Policies\ItemVariantPolicy;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ItemVariantPolicyTest extends TestCase
{
    #[Test]
    public function it_allows_guests_to_view_any(): void
    {
        $this->assertTrue((new ItemVariantPolicy)->viewAny(null));
    }

    #[Test]
    public function it_allows_guests_to_view(): void
    {
        $this->assertTrue((new ItemVariantPolicy)->view(null));
    }

    #[Test]
    public function it_allows_create(): void
    {
        $this->assertTrue((new ItemVariantPolicy)->create());
    }

    #[Test]
    public function it_allows_update(): void
    {
        $this->assertTrue((new ItemVariantPolicy)->update());
    }

    #[Test]
    public function it_allows_delete(): void
    {
        $this->assertTrue((new ItemVariantPolicy)->delete());
    }

    #[Test]
    public function it_allows_restore(): void
    {
        $this->assertTrue((new ItemVariantPolicy)->restore());
    }

    #[Test]
    public function it_allows_force_delete(): void
    {
        $this->assertTrue((new ItemVariantPolicy)->forceDelete());
    }
}
