<?php

namespace Tests\Feature\Demo;

use App\Models\Employee;
use App\Models\InventoryLocation;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DemoResetCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    private function enterDemoWithRealPasswords(): void
    {
        app()->detectEnvironment(fn () => 'demo');
        Config::set('seeders.passwords', [
            'admin' => 'operator-admin-secret',
            'employee' => 'operator-employee-secret',
            'inventory' => 'operator-inventory-secret',
        ]);
        Config::set('demo.account.email', 'demo@sushigo.com');
        Config::set('demo.account.password', 'public-demo-pass');
    }

    #[Test]
    public function refuses_to_run_outside_the_demo_environment(): void
    {
        $user = User::factory()->create();

        $this->artisan('demo:reset')
            ->expectsOutputToContain('only runs when APP_ENV=demo')
            ->assertExitCode(1);

        $this->assertModelExists($user);
    }

    #[Test]
    public function refuses_to_seed_demo_with_the_hardcoded_fallback_passwords(): void
    {
        app()->detectEnvironment(fn () => 'demo');
        Config::set('seeders.passwords', [
            'admin' => 'admin123456',
            'employee' => 'operator-employee-secret',
            'inventory' => 'operator-inventory-secret',
        ]);

        $this->artisan('demo:reset')
            ->expectsOutputToContain('SEEDER_ADMIN_PASSWORD')
            ->assertExitCode(1);
    }

    #[Test]
    public function restores_the_canonical_demo_dataset_and_discards_visitor_changes(): void
    {
        $this->enterDemoWithRealPasswords();
        $visitorLeftover = User::factory()->create(['email' => 'visitor-made@example.com']);

        $this->artisan('demo:reset')
            ->expectsOutputToContain('demo:reset completed')
            ->assertExitCode(0);

        $this->assertDatabaseMissing('users', ['email' => $visitorLeftover->email]);

        $demoUser = User::where('email', 'demo@sushigo.com')->firstOrFail();
        $this->assertTrue(Hash::check('public-demo-pass', $demoUser->password));
        $this->assertSame(['demo-viewer'], $demoUser->getRoleNames()->all());
        $this->assertTrue($demoUser->operatingUnits()->exists());

        $this->assertGreaterThan(0, Employee::count());
        $this->assertGreaterThan(0, Item::count());
        $this->assertGreaterThan(0, ItemVariant::count());
        $this->assertGreaterThan(0, InventoryLocation::count());
        $this->assertGreaterThan(0, Stock::where('on_hand', '>', 0)->count());
    }

    #[Test]
    public function reset_is_deterministic_across_runs(): void
    {
        $this->enterDemoWithRealPasswords();

        $this->artisan('demo:reset')->assertExitCode(0);
        $first = $this->snapshot();

        $this->artisan('demo:reset')->assertExitCode(0);

        $this->assertSame($first, $this->snapshot());
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshot(): array
    {
        return [
            'users' => User::orderBy('email')->pluck('email')->all(),
            'employees' => Employee::with('employmentPeriods')->orderBy('code')->get()
                ->map(fn (Employee $e) => [$e->code, $e->is_active, $e->employmentPeriods->pluck('start_date')->map(fn ($d) => (string) $d)->all()])
                ->all(),
            'variants' => ItemVariant::orderBy('code')->pluck('code')->all(),
            'stock' => Stock::query()
                ->join('item_variants', 'item_variants.id', '=', 'stock.item_variant_id')
                ->orderBy('item_variants.code')
                ->pluck('stock.on_hand', 'item_variants.code')
                ->map(fn ($qty) => (string) $qty)
                ->all(),
        ];
    }
}
