<?php

namespace Tests\Unit\Policies;

use App\Policies\InventoryLocationPolicy;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InventoryLocationPolicyTest extends TestCase
{
    #[Test]
    public function it_allows_guests_to_view_any(): void
    {
        $this->assertTrue((new InventoryLocationPolicy)->viewAny(null));
    }

    #[Test]
    public function it_allows_guests_to_view(): void
    {
        $this->assertTrue((new InventoryLocationPolicy)->view(null));
    }

    #[Test]
    public function it_allows_create(): void
    {
        $this->assertTrue((new InventoryLocationPolicy)->create());
    }

    #[Test]
    public function it_allows_update(): void
    {
        $this->assertTrue((new InventoryLocationPolicy)->update());
    }

    #[Test]
    public function it_allows_delete(): void
    {
        $this->assertTrue((new InventoryLocationPolicy)->delete());
    }

    #[Test]
    public function it_allows_restore(): void
    {
        $this->assertTrue((new InventoryLocationPolicy)->restore());
    }

    #[Test]
    public function it_allows_force_delete(): void
    {
        $this->assertTrue((new InventoryLocationPolicy)->forceDelete());
    }
}
