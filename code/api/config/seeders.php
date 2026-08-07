<?php

/*
|--------------------------------------------------------------------------
| Seeder Passwords
|--------------------------------------------------------------------------
|
| Single source of truth for passwords used by dev/test/production
| seeders. Override via env vars without touching seeder source code.
| Declared here (not inline in the returned array) so every config key
| below — including development_users/development_employees — can
| reference the same values and stay in sync with env overrides.
|
*/
$seederPasswords = [
    'admin' => env('SEEDER_ADMIN_PASSWORD', 'admin123456'),
    'employee' => env('SEEDER_EMPLOYEE_PASSWORD', 'employee123456'),
    'inventory' => env('SEEDER_INVENTORY_PASSWORD', 'inventory123456'),
];

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

    'passwords' => $seederPasswords,

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
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'superadmin@sushigo.com',
            'password' => $seederPasswords['admin'],
            'role' => 'super-admin',
            // super-admin is not an employee — system-level account only
        ],
        [
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin@sushigo.com',
            'password' => $seederPasswords['admin'],
            'role' => 'admin',
            'employee' => [
                'code' => 'ADM-001',
                'position_roles' => ['manager'],
                // Admins are free of attendance tracking, like super-admin (which has no employee record)
                'attendance_exempt' => true,
            ],
        ],
        [
            'first_name' => 'Inventory',
            'last_name' => 'Manager',
            'email' => 'inventory@sushigo.com',
            'password' => $seederPasswords['inventory'],
            'role' => 'inventory-manager',
            'employee' => [
                'code' => 'ADM-002',
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
            'password' => $seederPasswords['employee'],
        ],
        [
            'code' => 'EMP-002',
            'first_name' => 'María',
            'last_name' => 'García',
            'roles' => ['cook'],
            'email' => 'maria.garcia@sushigo.com',
            'phone' => '5512340002',
            'password' => $seederPasswords['employee'],
        ],
        [
            'code' => 'EMP-003',
            'first_name' => 'Pedro',
            'last_name' => 'López',
            'roles' => ['kitchen-assistant'],
            'email' => 'pedro.lopez@sushigo.com',
            'phone' => '5512340003',
            'password' => $seederPasswords['employee'],
        ],
        [
            'code' => 'EMP-004',
            'first_name' => 'Ana',
            'last_name' => 'Ramírez',
            'roles' => ['delivery-driver'],
            'email' => 'ana.ramirez@sushigo.com',
            'phone' => '5512340004',
            'password' => $seederPasswords['employee'],
        ],
        [
            'code' => 'EMP-005',
            'first_name' => 'Roberto',
            'last_name' => 'Sánchez',
            'roles' => ['cook'],
            'email' => 'roberto.sanchez@sushigo.com',
            'phone' => '5512340005',
            'password' => $seederPasswords['employee'],
            'meta' => ['notes' => 'Part-time employee'],
        ],
        [
            'code' => 'EMP-006',
            'first_name' => 'Laura',
            'last_name' => 'Torres',
            'roles' => ['cook'],
            'email' => 'laura.torres@sushigo.com',
            'phone' => '5512340006',
            'password' => $seederPasswords['employee'],
        ],
        [
            'code' => 'EMP-007',
            'first_name' => 'Miguel',
            'last_name' => 'Flores',
            'roles' => ['kitchen-assistant'],
            'email' => 'miguel.flores@sushigo.com',
            'phone' => '5512340007',
            'password' => $seederPasswords['employee'],
        ],
        [
            'code' => 'EMP-008',
            'first_name' => 'Sofia',
            'last_name' => 'Vargas',
            'roles' => ['delivery-driver'],
            'email' => 'sofia.vargas@sushigo.com',
            'phone' => '5512340008',
            'password' => $seederPasswords['employee'],
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
        'dish_categories' => 5,
        'dishes_per_category' => 8,
    ],

    /*
    |--------------------------------------------------------------------------
    | Development Dish Categories & Dishes
    |--------------------------------------------------------------------------
    |
    | The real live menu (Development/DishCategorySeeder + Development/DishSeeder),
    | matching sushigo-romita.com/menu. Order below is the display order.
    |
    | Each dish is a compact tuple: [name, description, base_price, extras?].
    | extras (if present) is [groupName, isRequired, selectionType, options],
    | where options is a list of [optionName, priceDelta] tuples.
    |
    */

    'development_dish_categories' => [
        'Rollos',
        'Onigiris',
        'Yakionigiris',
        'Sushiball',
        'Ramen',
        'Alitas',
        'Boneless',
        'Dumplings',
        'Paquetes',
    ],

    'development_dishes' => [
        'Rollos' => [
            ['California Roll', 'Aguacate, pepino y surimi envueltos en arroz y alga nori.', 120.00],
            ['Philadelphia Roll', 'Salmón, queso crema y pepino, cubierto con ajonjolí tostado.', 130.00],
            ['Spicy Tuna Roll', 'Atún picante, cebollín y ajonjolí envueltos en arroz y alga nori.', 135.00, [
                'Salsa extra', false, 'MULTIPLE',
                [['Salsa de anguila', 15.00], ['Sriracha mayo', 10.00], ['Salsa de tamarindo', 15.00]],
            ]],
            ['Dragon Roll', 'Camarón tempura cubierto con aguacate y anguila glaseada.', 165.00],
            ['Tempura Roll', 'Camarón tempura, aguacate y pepino, bañado en salsa de anguila.', 140.00],
            ['Sushi Go Especial Roll', 'Combinación de atún, salmón y camarón tempura, coronado con hueva de pez volador.', 175.00],
        ],
        'Onigiris' => [
            ['Onigiri de Atún Picante', 'Bola de arroz rellena de atún picante, envuelta en alga nori.', 55.00],
            ['Onigiri de Salmón', 'Bola de arroz rellena de salmón fresco, envuelta en alga nori.', 55.00],
            ['Onigiri de Pollo Teriyaki', 'Bola de arroz rellena de pollo teriyaki, envuelta en alga nori.', 50.00],
            ['Onigiri Vegetariano', 'Bola de arroz rellena de vegetales encurtidos, envuelta en alga nori.', 45.00],
        ],
        'Yakionigiris' => [
            ['Yakionigiri Clásico', 'Onigiri a la plancha glaseado con salsa de soya dulce.', 60.00],
            ['Yakionigiri de Camarón', 'Onigiri a la plancha relleno de camarón, glaseado con salsa teriyaki.', 70.00],
            ['Yakionigiri de Res', 'Onigiri a la plancha relleno de res, glaseado con salsa teriyaki.', 75.00],
            ['Yakionigiri de Pollo', 'Onigiri a la plancha relleno de pollo, glaseado con salsa teriyaki.', 65.00],
        ],
        'Sushiball' => [
            ['Sushiball de Salmón', 'Bola de arroz cubierta con salmón fresco y ajonjolí.', 95.00],
            ['Sushiball de Atún', 'Bola de arroz cubierta con atún fresco y ajonjolí.', 100.00],
            ['Sushiball Especial', 'Bola de arroz cubierta con salmón, atún y aguacate.', 120.00],
            ['Sushiball Vegetariano', 'Bola de arroz cubierta con aguacate, pepino y zanahoria.', 85.00],
        ],
        'Ramen' => [
            ['Tonkotsu Ramen', 'Caldo cremoso de cerdo, chashu, huevo marinado y cebollín.', 145.00, [
                'Nivel de picor', true, 'SINGLE',
                [['Suave', 0.00], ['Medio', 0.00], ['Picante', 0.00]],
            ]],
            ['Shoyu Ramen', 'Caldo claro a base de soya, pollo desmenuzado y vegetales.', 135.00],
            ['Miso Ramen', 'Caldo de miso fermentado, cerdo, maíz y cebollín.', 140.00],
            ['Ramen Vegetariano', 'Caldo de vegetales, tofu, hongos y espinaca.', 125.00],
        ],
        'Alitas' => [
            ['Alitas BBQ', 'Alitas de pollo bañadas en salsa BBQ, acompañadas de aderezo ranch.', 110.00, [
                'Salsa', true, 'SINGLE',
                [['BBQ', 0.00], ['Búfalo', 0.00], ['Mango habanero', 0.00]],
            ]],
            ['Alitas Búfalo', 'Alitas de pollo bañadas en salsa búfalo picante.', 110.00],
            ['Alitas Teriyaki', 'Alitas de pollo glaseadas con salsa teriyaki y ajonjolí.', 115.00],
            ['Alitas Mango Habanero', 'Alitas de pollo bañadas en salsa dulce-picante de mango habanero.', 115.00],
        ],
        'Boneless' => [
            ['Boneless Clásico', 'Trozos de pollo empanizado bañados en salsa a elegir.', 105.00],
            ['Boneless BBQ', 'Trozos de pollo empanizado bañados en salsa BBQ.', 110.00],
            ['Boneless Búfalo', 'Trozos de pollo empanizado bañados en salsa búfalo picante.', 110.00],
        ],
        'Dumplings' => [
            ['Gyozas de Cerdo', 'Dumplings a la plancha rellenos de cerdo y vegetales.', 90.00],
            ['Gyozas Vegetarianas', 'Dumplings a la plancha rellenos de vegetales.', 85.00],
            ['Gyozas de Camarón', 'Dumplings a la plancha rellenos de camarón y vegetales.', 95.00],
        ],
        'Paquetes' => [
            ['Paquete Individual', '20 piezas variadas de rollos, ideal para una persona.', 180.00],
            ['Paquete Pareja', '40 piezas variadas de rollos, ideal para compartir entre dos.', 340.00],
            ['Paquete Familiar', '70 piezas variadas de rollos, ideal para compartir en familia.', 620.00],
            ['Paquete Fiesta', '100 piezas variadas de rollos, ramen y alitas, ideal para eventos.', 850.00],
        ],
    ],

];
