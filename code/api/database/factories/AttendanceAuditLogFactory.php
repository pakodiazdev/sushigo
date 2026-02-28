<?php

namespace Database\Factories;

use App\Enums\AuditAction;
use App\Models\AttendanceAuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<AttendanceAuditLog> */
class AttendanceAuditLogFactory extends Factory
{
    protected $model = AttendanceAuditLog::class;

    public function definition(): array
    {
        $action = fake()->randomElement(AuditAction::cases());

        return [
            'auditable_type' => 'App\\Models\\Employee',
            'auditable_id' => 1,
            'action' => $action,
            'old_values' => $action === AuditAction::CREATE ? null : ['name' => fake()->name()],
            'new_values' => $action === AuditAction::DELETE ? null : ['name' => fake()->name()],
            'user_id' => User::factory(),
            'reason' => fake()->optional()->sentence(),
        ];
    }

    public function create_action(): static
    {
        return $this->state(fn () => [
            'action' => AuditAction::CREATE,
            'old_values' => null,
            'new_values' => ['name' => fake()->name()],
        ]);
    }

    public function update_action(): static
    {
        return $this->state(fn () => [
            'action' => AuditAction::UPDATE,
            'old_values' => ['name' => fake()->name()],
            'new_values' => ['name' => fake()->name()],
        ]);
    }

    public function delete_action(): static
    {
        return $this->state(fn () => [
            'action' => AuditAction::DELETE,
            'old_values' => ['name' => fake()->name()],
            'new_values' => null,
        ]);
    }
}
