<?php

namespace Database\Seeders\Production;

use Database\Seeders\Base\LockedSeeder;
use Database\Seeders\Traits\SeedsPassportClients;

class PassportClientSeeder extends LockedSeeder
{
    use SeedsPassportClients;

    public function run(): void
    {
        $this->seedPassportClients();
    }
}
