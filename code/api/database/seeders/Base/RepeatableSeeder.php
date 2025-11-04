<?php

namespace Database\Seeders\Base;

use Database\Seeders\Traits\TrackableSeeder;
use Illuminate\Database\Seeder;

abstract class RepeatableSeeder extends Seeder
{
    use TrackableSeeder;

    protected function shouldLockAfterExecution(): bool
    {
        return false;
    }

    protected function shouldRunOnce(): bool
    {
        return false;
    }
}
