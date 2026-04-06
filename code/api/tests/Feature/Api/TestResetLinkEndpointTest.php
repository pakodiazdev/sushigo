<?php

namespace Tests\Feature\Api;

use App\Contracts\PasswordResetTokenRecorder;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TestResetLinkEndpointTest extends TestCase
{
    #[Test]
    public function returns_reset_link_when_recorded(): void
    {
        $recorder = app(PasswordResetTokenRecorder::class);
        $recorder->record('employee@sushigo.com', 'https://sushigo.local/reset-password?token=abc123');

        $response = $this->getJson('/api/v1/test/reset-link/employee@sushigo.com');

        $response->assertOk()
            ->assertJson(['link' => 'https://sushigo.local/reset-password?token=abc123']);

        // Clean up
        $recorder->clear();
    }

    #[Test]
    public function returns_404_when_no_link_recorded(): void
    {
        $response = $this->getJson('/api/v1/test/reset-link/unknown@sushigo.com');

        $response->assertNotFound()
            ->assertJson(['link' => null]);
    }
}
