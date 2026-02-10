<?php

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="EmployeeResponse",
 *     title="Employee Response",
 *     @OA\Property(property="id", type="string", example="xYz3kR9a", description="Hashid identifier"),
 *     @OA\Property(property="code", type="string", example="EMP-001"),
 *     @OA\Property(property="first_name", type="string", example="Juan"),
 *     @OA\Property(property="last_name", type="string", example="Perez"),
 *     @OA\Property(property="role", type="string", enum={"MANAGER", "COOK", "KITCHEN_ASSISTANT", "DELIVERY_DRIVER"}, example="COOK"),
 *     @OA\Property(property="is_active", type="boolean", example=true),
 *     @OA\Property(property="user_id", type="integer", nullable=true, example=null),
 *     @OA\Property(property="meta", type="object", nullable=true),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2026-02-09T00:00:00.000000Z"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2026-02-09T00:00:00.000000Z")
 * )
 */
class EmployeeResponse {}
