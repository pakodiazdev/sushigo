<?php

namespace App\Services\EmployeeRequests;

use App\Models\EmployeeRequest;
use Illuminate\Database\Eloquent\Model;

interface RequestHandler
{
    public function handle(EmployeeRequest $employeeRequest): Model;
}
