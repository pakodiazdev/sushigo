<?php

namespace Tests\Unit\Policies;

use App\Policies\ItemPolicy;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ItemPolicyTest extends TestCase
{
    #[Test]
    public function it_allows_guests_to_view_any(): void
    {
        $this->assertTrue((new ItemPolicy)->viewAny(null));
    }

    #[Test]
    public function it_allows_guests_to_view(): void
    {
        $this->assertTrue((new ItemPolicy)->view(null));
    }

    #[Test]
    public function it_allows_create(): void
    {
        $this->assertTrue((new ItemPolicy)->create());
    }

    #[Test]
    public function it_allows_update(): void
    {
        $this->assertTrue((new ItemPolicy)->update());
    }

    #[Test]
    public function it_allows_delete(): void
    {
        $this->assertTrue((new ItemPolicy)->delete());
    }

    #[Test]
    public function it_allows_restore(): void
    {
        $this->assertTrue((new ItemPolicy)->restore());
    }

    #[Test]
    public function it_allows_force_delete(): void
    {
        $this->assertTrue((new ItemPolicy)->forceDelete());
    }
}
