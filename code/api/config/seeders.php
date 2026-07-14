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
        'devtest' => Database\Seeders\Development\DevelopmentSeeder::class,
        'testing' => Database\Seeders\Development\DevelopmentSeeder::class,
    ],

    /*
    |--------------------------------------------------------------------------
    | Seeder Passwords
    |--------------------------------------------------------------------------
    |
    | Single source of truth for passwords used by dev/test/production
    | seeders. Override via env vars without touching seeder source code.
    |
    */

    'passwords' => [
        'admin' => env('SEEDER_ADMIN_PASSWORD', 'admin123456'),
        'employee' => env('SEEDER_EMPLOYEE_PASSWORD', 'employee123456'),
        'inventory' => env('SEEDER_INVENTORY_PASSWORD', 'inventory123456'),
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
            // super-admin is not an employee — system-level account only
        ],
        [
            'name' => 'Admin User',
            'email' => 'admin@sushigo.com',
            'password' => 'admin123456',
            'role' => 'admin',
            'employee' => [
                'code' => 'ADM-001',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'position_roles' => ['manager'],
                // Admins are free of attendance tracking, like super-admin (which has no employee record)
                'attendance_exempt' => true,
            ],
        ],
        [
            'name' => 'Inventory Manager',
            'email' => 'inventory@sushigo.com',
            'password' => 'inventory123456',
            'role' => 'inventory-manager',
            'employee' => [
                'code' => 'ADM-002',
                'first_name' => 'Inventory',
                'last_name' => 'Manager',
                'position_roles' => ['manager'],
            ],
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
            'roles' => ['manager'],
            'email' => 'carlos.mendoza@sushigo.com',
            'phone' => '5512340001',
            'password' => 'employee123456',
        ],
        [
            'code' => 'EMP-002',
            'first_name' => 'María',
            'last_name' => 'García',
            'roles' => ['cook'],
            'email' => 'maria.garcia@sushigo.com',
            'phone' => '5512340002',
            'password' => 'employee123456',
        ],
        [
            'code' => 'EMP-003',
            'first_name' => 'Pedro',
            'last_name' => 'López',
            'roles' => ['kitchen-assistant'],
            'email' => 'pedro.lopez@sushigo.com',
            'phone' => '5512340003',
            'password' => 'employee123456',
        ],
        [
            'code' => 'EMP-004',
            'first_name' => 'Ana',
            'last_name' => 'Ramírez',
            'roles' => ['delivery-driver'],
            'email' => 'ana.ramirez@sushigo.com',
            'phone' => '5512340004',
            'password' => 'employee123456',
        ],
        [
            'code' => 'EMP-005',
            'first_name' => 'Roberto',
            'last_name' => 'Sánchez',
            'roles' => ['cook'],
            'email' => 'roberto.sanchez@sushigo.com',
            'phone' => '5512340005',
            'password' => 'employee123456',
            'meta' => ['notes' => 'Part-time employee'],
        ],
        [
            'code' => 'EMP-006',
            'first_name' => 'Laura',
            'last_name' => 'Torres',
            'roles' => ['cook'],
            'email' => 'laura.torres@sushigo.com',
            'phone' => '5512340006',
            'password' => 'employee123456',
        ],
        [
            'code' => 'EMP-007',
            'first_name' => 'Miguel',
            'last_name' => 'Flores',
            'roles' => ['kitchen-assistant'],
            'email' => 'miguel.flores@sushigo.com',
            'phone' => '5512340007',
            'password' => 'employee123456',
        ],
        [
            'code' => 'EMP-008',
            'first_name' => 'Sofia',
            'last_name' => 'Vargas',
            'roles' => ['delivery-driver'],
            'email' => 'sofia.vargas@sushigo.com',
            'phone' => '5512340008',
            'password' => 'employee123456',
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
        'employees' => 5,
    ],

];
