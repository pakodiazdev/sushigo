<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Spatie\Permission\PermissionRegistrar;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Clear Spatie permission cache before every test to prevent stale
        // role/permission data from leaking across tests when using
        // RefreshDatabase with transaction rollback.
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
