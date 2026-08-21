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
        'fake_products' => 20,
        'fake_variants_per_product' => 2,
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

    /*
    |--------------------------------------------------------------------------
    | Development Product Catalog (Brands, Categories, Products, Variants,
    | Purchase Presentation Templates)
    |--------------------------------------------------------------------------
    |
    | Believable retail catalog for the restaurant's small resale shelf
    | (Development/BrandSeeder, InventoryCategorySeeder,
    | PurchasePresentationTemplateSeeder, ProductCatalogSeeder). Real-world
    | brand/flavor/size facts (Coca-Cola, Buldak/Samyang, Peelez/Peelerz,
    | Ramune, Mochi) confirmed via web research per #428 — see the PR's
    | "Assumptions" section for sources. No cost, supplier, purchase, stock
    | or branch price data is seeded here — see
    | doc/architecture/product-catalog/product-catalog-architecture.en.md.
    |
    | All Variants below share the 'UN' (Unidad) base unit of measure — each
    | is counted as one sellable retail unit (can, bottle, bag, box), never
    | by weight/volume — so every Purchase Presentation Template's
    | compatible_dimension_uom_id also resolves to 'UN'.
    |
    */

    'development_brands' => [
        'Coca-Cola',
        'Buldak',
        'Peelez',
        'Ramune',
        'Mochis',
    ],

    'development_inventory_categories' => [
        'Bebidas',
        'Ramen Instantáneo',
        'Dulces y Botanas',
        'Postres Congelados',
    ],

    'development_purchase_presentation_templates' => [
        ['code' => 'UNIT_1', 'name' => 'Unidad Individual', 'package_type' => 'UNIT', 'base_unit_quantity' => 1, 'is_active' => true],
        ['code' => 'PACK_5', 'name' => 'Paquete x5', 'package_type' => 'PACK', 'base_unit_quantity' => 5, 'is_active' => true],
        ['code' => 'PACK_6', 'name' => 'Paquete x6', 'package_type' => 'PACK', 'base_unit_quantity' => 6, 'is_active' => true],
        ['code' => 'BOX_24', 'name' => 'Caja x24', 'package_type' => 'BOX', 'base_unit_quantity' => 24, 'is_active' => true],
        ['code' => 'TRAY_12', 'name' => 'Charola x12', 'package_type' => 'TRAY', 'base_unit_quantity' => 12, 'is_active' => false],
    ],

    'development_products' => [
        [
            'name' => 'Coca-Cola',
            'description' => 'Refresco de cola clásico, disponible en lata y botella.',
            'brand' => 'Coca-Cola',
            'category' => 'Bebidas',
            'is_active' => true,
            'is_perishable' => false,
            'variants' => [
                ['name' => 'Lata 355ml', 'code' => 'COKE-ORIG-CAN355', 'barcode' => '7501055300013', 'is_active' => true, 'presentations' => [
                    ['template' => 'BOX_24', 'is_default' => true, 'is_active' => true, 'package_barcode' => '17501055300010'],
                    ['template' => 'UNIT_1', 'is_default' => false, 'is_active' => true, 'package_barcode' => null],
                ]],
                ['name' => 'Botella 600ml', 'code' => 'COKE-ORIG-BOT600', 'barcode' => '7501055300020', 'is_active' => true, 'presentations' => [
                    ['template' => 'UNIT_1', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
                ['name' => 'Botella 2L', 'code' => 'COKE-ORIG-BOT2000', 'barcode' => '7501055300037', 'is_active' => true, 'presentations' => [
                    ['template' => 'UNIT_1', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
            ],
        ],
        [
            'name' => 'Coca-Cola Sin Azúcar',
            'description' => 'Refresco de cola sin azúcar, mismo sabor clásico sin calorías.',
            'brand' => 'Coca-Cola',
            'category' => 'Bebidas',
            'is_active' => true,
            'is_perishable' => false,
            'variants' => [
                ['name' => 'Lata 355ml', 'code' => 'COKE-ZERO-CAN355', 'barcode' => '7501055301010', 'is_active' => true, 'presentations' => [
                    ['template' => 'BOX_24', 'is_default' => true, 'is_active' => true, 'package_barcode' => '17501055301017'],
                ]],
            ],
        ],
        [
            'name' => 'Coca-Cola Vainilla',
            'description' => 'Refresco de cola con esencia de vainilla. Edición descontinuada.',
            'brand' => 'Coca-Cola',
            'category' => 'Bebidas',
            'is_active' => false,
            'is_perishable' => false,
            'variants' => [
                ['name' => 'Lata 355ml', 'code' => 'COKE-VAINILLA-CAN355', 'barcode' => '7501055302017', 'is_active' => false, 'presentations' => []],
            ],
        ],
        [
            'name' => 'Buldak Ramen',
            'description' => 'Ramen instantáneo coreano extra picante de Samyang, sabor pollo picante (Buldak).',
            'brand' => 'Buldak',
            'category' => 'Ramen Instantáneo',
            'is_active' => true,
            'is_perishable' => false,
            'variants' => [
                ['name' => 'Original 140g', 'code' => 'BULDAK-ORIGINAL-140', 'barcode' => '8801073114517', 'is_active' => true, 'presentations' => [
                    ['template' => 'BOX_24', 'is_default' => true, 'is_active' => true, 'package_barcode' => '28801073114511'],
                ]],
                ['name' => '2x Spicy 140g', 'code' => 'BULDAK-2XSPICY-140', 'barcode' => '8801073121195', 'is_active' => true, 'presentations' => [
                    ['template' => 'PACK_5', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
                ['name' => 'Carbonara 140g', 'code' => 'BULDAK-CARBONARA-140', 'barcode' => '8801073131149', 'is_active' => false, 'presentations' => []],
                ['name' => 'Cheese 140g', 'code' => 'BULDAK-CHEESE-140', 'barcode' => '8801073136045', 'is_active' => true, 'presentations' => [
                    ['template' => 'PACK_5', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
            ],
        ],
        [
            'name' => 'Peelez Gomitas Pelables',
            'description' => 'Gomitas de fruta pelables, hechas con jugo real.',
            'brand' => 'Peelez',
            'category' => 'Dulces y Botanas',
            'is_active' => true,
            'is_perishable' => false,
            'variants' => [
                ['name' => 'Mango 85g', 'code' => 'PEELEZ-MANGO-85', 'barcode' => '8801234567800', 'is_active' => true, 'presentations' => [
                    ['template' => 'UNIT_1', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
                ['name' => 'Piña 85g', 'code' => 'PEELEZ-PINA-85', 'barcode' => '8801234567817', 'is_active' => true, 'presentations' => [
                    ['template' => 'UNIT_1', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
                ['name' => 'Variedad Tropical 240g', 'code' => 'PEELEZ-TROPICAL-240', 'barcode' => '8801234567824', 'is_active' => true, 'presentations' => [
                    ['template' => 'UNIT_1', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
            ],
        ],
        [
            'name' => 'Peelez Gomitas Pelables Sandía',
            'description' => 'Gomitas pelables sabor sandía, hechas con jugo real.',
            'brand' => 'Peelez',
            'category' => 'Dulces y Botanas',
            'is_active' => true,
            'is_perishable' => false,
            'variants' => [
                ['name' => 'Sandía 85g', 'code' => 'PEELEZ-SANDIA-85', 'barcode' => '8801234567831', 'is_active' => true, 'presentations' => [
                    ['template' => 'UNIT_1', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
            ],
        ],
        [
            'name' => 'Ramune',
            'description' => 'Refresco japonés carbonatado en botella Codd tradicional, sellada con canica de vidrio.',
            'brand' => 'Ramune',
            'category' => 'Bebidas',
            'is_active' => true,
            'is_perishable' => false,
            'variants' => [
                ['name' => 'Original 200ml', 'code' => 'RAMUNE-ORIGINAL-200', 'barcode' => '4902580220105', 'is_active' => true, 'presentations' => [
                    ['template' => 'PACK_6', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                    ['template' => 'TRAY_12', 'is_default' => false, 'is_active' => false, 'package_barcode' => null],
                ]],
                ['name' => 'Fresa 200ml', 'code' => 'RAMUNE-FRESA-200', 'barcode' => '4902580220112', 'is_active' => true, 'presentations' => [
                    ['template' => 'PACK_6', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
                ['name' => 'Melón 200ml', 'code' => 'RAMUNE-MELON-200', 'barcode' => '4902580220129', 'is_active' => true, 'presentations' => [
                    ['template' => 'PACK_6', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
            ],
        ],
        [
            'name' => 'Mochi Helado',
            'description' => 'Mochi relleno de helado, postre congelado japonés en caja.',
            'brand' => 'Mochis',
            'category' => 'Postres Congelados',
            'is_active' => true,
            'is_perishable' => true,
            'variants' => [
                ['name' => 'Caja 6pz Mango', 'code' => 'MOCHI-MANGO-CAJA6', 'barcode' => '4902102072410', 'is_active' => true, 'presentations' => [
                    ['template' => 'UNIT_1', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
                ['name' => 'Caja 6pz Fresa', 'code' => 'MOCHI-FRESA-CAJA6', 'barcode' => '4902102072427', 'is_active' => true, 'presentations' => [
                    ['template' => 'UNIT_1', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
                ['name' => 'Caja 9pz Surtido', 'code' => 'MOCHI-SURTIDO-CAJA9', 'barcode' => '4902102072434', 'is_active' => true, 'presentations' => [
                    ['template' => 'UNIT_1', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
            ],
        ],
        [
            'name' => 'Mochi Helado Matcha',
            'description' => 'Mochi relleno de helado sabor matcha, postre congelado japonés.',
            'brand' => 'Mochis',
            'category' => 'Postres Congelados',
            'is_active' => true,
            'is_perishable' => true,
            'variants' => [
                ['name' => 'Caja 6pz Matcha', 'code' => 'MOCHI-MATCHA-CAJA6', 'barcode' => '4902102072441', 'is_active' => true, 'presentations' => [
                    ['template' => 'UNIT_1', 'is_default' => true, 'is_active' => true, 'package_barcode' => null],
                ]],
            ],
        ],
    ],

];
