<?php

namespace Tests\Feature\Inventory;

use App\Models\Employee;
use App\Models\UnitOfMeasure;
use App\Models\UomConversion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * UOM Conversion identifier contract (#581): `UomConversion` itself has no
 * public_id (its own `id` stays the internal numeric primary key), but its
 * `from_uom_id`/`to_uom_id` foreign keys reference `UnitOfMeasure`, which is
 * ULID-based — the request must accept public_id and the response must
 * serialize public_id for both the flat FKs and the nested from_uom/to_uom.
 */
class UomConversionCrudTest extends TestCase
{
    use RefreshDatabase;

    private UnitOfMeasure $kg;

    private UnitOfMeasure $gr;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'units_of_measure.manage', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $role = Role::firstOrCreate(['name' => 'inventory-manager', 'guard_name' => 'api']);
        $role->givePermissionTo('units_of_measure.manage');

        $user = User::factory()->create();
        $user->assignRole('inventory-manager');
        Passport::actingAs($user);

        $this->kg = UnitOfMeasure::create(['code' => 'KG', 'name' => 'Kilogramo', 'symbol' => 'kg']);
        $this->gr = UnitOfMeasure::create(['code' => 'GR', 'name' => 'Gramo', 'symbol' => 'g']);
    }

    #[Test]
    public function it_creates_a_conversion_from_public_ids_and_returns_ulid_references(): void
    {
        $response = $this->postJson('/api/v1/uom-conversions', [
            'from_uom_id' => $this->kg->public_id,
            'to_uom_id' => $this->gr->public_id,
            'factor' => 1000,
        ]);

        $response->assertStatus(201);

        $data = $response->json('data');

        // The conversion's own id has no public_id counterpart (#581) — it
        // stays the internal numeric primary key.
        $conversion = UomConversion::findOrFail($data['id']);
        $this->assertIsInt($data['id']);

        // But every reference to a UnitOfMeasure must be its public_id, never
        // the raw numeric FK the database column stores.
        $this->assertSame($this->kg->public_id, $data['from_uom_id']);
        $this->assertSame($this->gr->public_id, $data['to_uom_id']);
        $this->assertSame($this->kg->public_id, $data['from_uom']['id']);
        $this->assertSame($this->gr->public_id, $data['to_uom']['id']);

        // The internal numeric FK columns are what actually got persisted.
        $this->assertSame($this->kg->id, $conversion->from_uom_id);
        $this->assertSame($this->gr->id, $conversion->to_uom_id);
    }

    #[Test]
    public function it_rejects_a_numeric_id_where_a_public_id_is_required(): void
    {
        $this->postJson('/api/v1/uom-conversions', [
            'from_uom_id' => $this->kg->id,
            'to_uom_id' => $this->gr->id,
            'factor' => 1000,
        ])->assertStatus(422)->assertJsonValidationErrors(['from_uom_id', 'to_uom_id']);
    }

    #[Test]
    public function it_returns_a_validation_error_instead_of_crashing_on_a_malformed_from_uom_id(): void
    {
        // #623 review: the duplicate-pair closure on `to_uom_id` used to read
        // the raw `from_uom_id` input unconditionally — an array there passes
        // straight through to a `?string` parameter and throws a TypeError
        // (500) instead of surfacing the `string` rule's own 422.
        $this->postJson('/api/v1/uom-conversions', [
            'from_uom_id' => [],
            'to_uom_id' => $this->gr->public_id,
            'factor' => 1000,
        ])->assertStatus(422)->assertJsonValidationErrors(['from_uom_id']);
    }

    #[Test]
    public function it_rejects_a_duplicate_conversion_pair_identified_by_public_id(): void
    {
        $this->postJson('/api/v1/uom-conversions', [
            'from_uom_id' => $this->kg->public_id,
            'to_uom_id' => $this->gr->public_id,
            'factor' => 1000,
        ])->assertStatus(201);

        $this->postJson('/api/v1/uom-conversions', [
            'from_uom_id' => $this->kg->public_id,
            'to_uom_id' => $this->gr->public_id,
            'factor' => 500,
        ])->assertStatus(422)->assertJsonValidationErrors(['to_uom_id']);
    }

    #[Test]
    public function it_lists_conversions_filtered_by_public_id_and_serializes_ulid_references(): void
    {
        UomConversion::create(['from_uom_id' => $this->kg->id, 'to_uom_id' => $this->gr->id, 'factor' => 1000]);

        $mg = UnitOfMeasure::create(['code' => 'MG', 'name' => 'Miligramo', 'symbol' => 'mg']);
        UomConversion::create(['from_uom_id' => $this->gr->id, 'to_uom_id' => $mg->id, 'factor' => 1000]);

        $response = $this->getJson('/api/v1/uom-conversions?from_uom_id='.$this->kg->public_id);

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame($this->kg->public_id, $data[0]['from_uom_id']);
        $this->assertSame($this->gr->public_id, $data[0]['to_uom_id']);
    }

    #[Test]
    public function it_deletes_a_conversion_by_its_own_numeric_id(): void
    {
        $conversion = UomConversion::create([
            'from_uom_id' => $this->kg->id,
            'to_uom_id' => $this->gr->id,
            'factor' => 1000,
        ]);

        $this->deleteJson("/api/v1/uom-conversions/{$conversion->id}")->assertStatus(200);
        $this->assertDatabaseMissing('uom_conversions', ['id' => $conversion->id]);
    }
}
