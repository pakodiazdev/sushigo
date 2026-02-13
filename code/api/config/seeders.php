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
    | Development Employees
    |--------------------------------------------------------------------------
    |
    | Default employees created in development environment.
    | Every employee gets a system user created automatically.
    | User can be identified by email or phone number.
    |
    */

    'development_employees' => [
        [
            'code' => 'EMP-001',
            'first_name' => 'Carlos',
            'last_name' => 'Mendoza',
            'roles' => ['employee-manager'],
            'email' => 'carlos.mendoza@sushigo.com',
            'phone' => '5512340001',
            'password' => 'employee123456',
        ],
        [
            'code' => 'EMP-002',
            'first_name' => 'María',
            'last_name' => 'García',
            'roles' => ['employee-cook'],
            'email' => 'maria.garcia@sushigo.com',
            'phone' => '5512340002',
            'password' => 'employee123456',
        ],
        [
            'code' => 'EMP-003',
            'first_name' => 'Pedro',
            'last_name' => 'López',
            'roles' => ['employee-kitchen-assistant'],
            'email' => 'pedro.lopez@sushigo.com',
            'phone' => '5512340003',
            'password' => 'employee123456',
        ],
        [
            'code' => 'EMP-004',
            'first_name' => 'Ana',
            'last_name' => 'Ramírez',
            'roles' => ['employee-delivery-driver'],
            'email' => 'ana.ramirez@sushigo.com',
            'phone' => '5512340004',
            'password' => 'employee123456',
        ],
        [
            'code' => 'EMP-005',
            'first_name' => 'Roberto',
            'last_name' => 'Sánchez',
            'roles' => ['employee-cook'],
            'email' => 'roberto.sanchez@sushigo.com',
            'phone' => '5512340005',
            'password' => 'employee123456',
            'meta' => ['notes' => 'Part-time employee'],
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
        'employees' => 5,
    ],

];
