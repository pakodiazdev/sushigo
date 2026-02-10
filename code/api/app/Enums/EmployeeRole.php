<?php

namespace App\Enums;

enum EmployeeRole: string
{
    case MANAGER = 'MANAGER';
    case COOK = 'COOK';
    case KITCHEN_ASSISTANT = 'KITCHEN_ASSISTANT';
    case DELIVERY_DRIVER = 'DELIVERY_DRIVER';
}
