<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Seeder Environment Configuration
    |--------------------------------------------------------------------------
    |
    | This configuration determines which seeders should run in each environment.
    | The DatabaseSeeder will automatically detect the environment and run
    | the appropriate seeders.
    |
    */

    'environments' => [
        'production' => Database\Seeders\Production\ProductionSeeder::class,
        'local' => Database\Seeders\Development\DevelopmentSeeder::class,
        'development' => Database\Seeders\Development\DevelopmentSeeder::class,
        'dev' => Database\Seeders\Development\DevelopmentSeeder::class,
        'testing' => Database\Seeders\Development\DevelopmentSeeder::class,
    ],

    /*
    |--------------------------------------------------------------------------
    | Development Users
    |--------------------------------------------------------------------------
    |
    | Default users created in development environment.
    |
    */

    'development_users' => [
        [
            'name' => 'Super Admin',
            'email' => 'superadmin@sushigo.com',
            'password' => 'admin123456',
            'role' => 'super-admin',
        ],
        [
            'name' => 'Admin User',
            'email' => 'admin@sushigo.com',
            'password' => 'admin123456',
            'role' => 'admin',
        ],
        [
            'name' => 'Inventory Manager',
            'email' => 'inventory@sushigo.com',
            'password' => 'inventory123456',
            'role' => 'inventory-manager',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Factory Count
    |--------------------------------------------------------------------------
    |
    | Number of random records to create using factories in development.
    |
    */

    'factory_counts' => [
        'users' => 10,
    ],

];
