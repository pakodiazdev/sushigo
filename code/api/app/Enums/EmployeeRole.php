<?php

namespace App\Enums;

enum EmployeeRole: string
{
    case MANAGER = 'MANAGER';
    case COOK = 'COOK';
    case KITCHEN_ASSISTANT = 'KITCHEN_ASSISTANT';
    case DELIVERY_DRIVER = 'DELIVERY_DRIVER';

    /**
     * Map the domain employee role to the operational Spatie role
     * used for system access permissions.
     */
    public function spatieRole(): string
    {
        return match ($this) {
            self::MANAGER => 'employee-manager',
            self::COOK,
            self::KITCHEN_ASSISTANT,
            self::DELIVERY_DRIVER => 'employee',
        };
    }
}
