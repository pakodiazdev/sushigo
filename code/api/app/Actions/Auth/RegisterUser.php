<?php

namespace App\Actions\Auth;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\Hash;

class RegisterUser
{
    public function __construct(
        private readonly UserRepository $userRepository,
    ) {}

    public function __invoke(array $data): User
    {
        $phoneCountry = config('employees.default_phone_country');

        return $this->userRepository->create([
            'name'          => $data['name'],
            'email'         => $data['email'] ?? null,
            'phone'         => $data['phone'] ?? null,
            'phone_country' => isset($data['phone']) ? $phoneCountry : null,
            'password'      => Hash::make($data['password']),
        ]);
    }
}
