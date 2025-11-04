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
            'name' => 'Admin User',
            'email' => 'admin@sushigo.com',
            'password' => 'admin123456',
            'role' => 'super-admin',
        ],
        [
            'name' => 'Demo User',
            'email' => 'demo@sushigo.com',
            'password' => 'demo123456',
            'role' => 'user',
        ],
        [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'role' => 'user',
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
