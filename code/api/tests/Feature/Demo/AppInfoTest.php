<?php

namespace Tests\Feature\Demo;

use Illuminate\Support\Facades\Config;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AppInfoTest extends TestCase
{
    #[Test]
    public function reports_non_demo_environment_without_demo_account(): void
    {
        $this->getJson('/api/v1/app-info')
            ->assertOk()
            ->assertJsonPath('status', 200)
            ->assertJsonPath('data.environment', 'testing')
            ->assertJsonPath('data.is_demo', false)
            ->assertJsonPath('data.demo_account', null);
    }

    #[Test]
    public function reports_demo_environment_with_public_demo_account_email_only(): void
    {
        app()->detectEnvironment(fn () => 'demo');
        Config::set('demo.account.email', 'demo@sushigo.com');
        Config::set('demo.account.password', 'never-exposed');

        $response = $this->getJson('/api/v1/app-info')
            ->assertOk()
            ->assertJsonPath('data.environment', 'demo')
            ->assertJsonPath('data.is_demo', true)
            ->assertJsonPath('data.demo_account.email', 'demo@sushigo.com')
            ->assertJsonPath('data.data_resets', true);

        $this->assertStringNotContainsString('never-exposed', $response->getContent());
    }
}
