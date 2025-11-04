<?php

namespace Database\Seeders\Base;

use Database\Seeders\Traits\TrackableSeeder;
use Illuminate\Database\Seeder;

abstract class LockedSeeder extends Seeder
{
    use TrackableSeeder;

    protected function shouldLockAfterExecution(): bool
    {
        return true;
    }

    protected function shouldRunOnce(): bool
    {
        return true;
    }
}
