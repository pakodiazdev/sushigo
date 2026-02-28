<?php

namespace Tests\Feature\Services\CashAdjustments;

use Tests\TestCase;

class CashExpenseServiceTest extends TestCase
{
    /**
     * A basic feature test example.
     */
    public function test_example(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }
}
