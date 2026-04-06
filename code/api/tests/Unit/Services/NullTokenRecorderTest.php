<?php

namespace Tests\Unit\Services;

use App\Services\Testing\NullTokenRecorder;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class NullTokenRecorderTest extends TestCase
{
    private NullTokenRecorder $recorder;

    protected function setUp(): void
    {
        parent::setUp();

        $this->recorder = new NullTokenRecorder;
    }

    #[Test]
    public function record_does_not_throw(): void
    {
        // No-op — should not throw
        $this->recorder->record('test@example.com', 'https://link.com');
        $this->assertTrue(true);
    }

    #[Test]
    public function retrieve_always_returns_null(): void
    {
        $this->recorder->record('test@example.com', 'https://link.com');

        $this->assertNull($this->recorder->retrieve('test@example.com'));
    }

    #[Test]
    public function clear_does_not_throw(): void
    {
        $this->recorder->clear();
        $this->assertTrue(true);
    }
}
