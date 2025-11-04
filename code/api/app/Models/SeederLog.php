<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeederLog extends Model
{
    protected $fillable = [
        'seeder_class',
        'environment',
        'is_locked',
        'executed_at',
        'locked_at',
        'notes',
    ];

    protected $casts = [
        'is_locked' => 'boolean',
        'executed_at' => 'datetime',
        'locked_at' => 'datetime',
    ];

    public static function hasRun(string $seederClass, ?string $environment = null): bool
    {
        $environment = $environment ?? app()->environment();

        return self::where('seeder_class', $seederClass)
            ->where('environment', $environment)
            ->exists();
    }

    public static function isLocked(string $seederClass, ?string $environment = null): bool
    {
        $environment = $environment ?? app()->environment();

        return self::where('seeder_class', $seederClass)
            ->where('environment', $environment)
            ->where('is_locked', true)
            ->exists();
    }

    public static function markAsRun(string $seederClass, ?string $environment = null, bool $lock = false): self
    {
        $environment = $environment ?? app()->environment();

        return self::updateOrCreate(
            [
                'seeder_class' => $seederClass,
                'environment' => $environment,
            ],
            [
                'executed_at' => now(),
                'is_locked' => $lock,
                'locked_at' => $lock ? now() : null,
            ]
        );
    }

    public static function lock(string $seederClass, ?string $environment = null, ?string $notes = null): bool
    {
        $environment = $environment ?? app()->environment();

        return self::where('seeder_class', $seederClass)
            ->where('environment', $environment)
            ->update([
                'is_locked' => true,
                'locked_at' => now(),
                'notes' => $notes,
            ]) > 0;
    }

    public static function unlock(string $seederClass, ?string $environment = null): bool
    {
        $environment = $environment ?? app()->environment();

        return self::where('seeder_class', $seederClass)
            ->where('environment', $environment)
            ->update([
                'is_locked' => false,
                'locked_at' => null,
            ]) > 0;
    }
}
