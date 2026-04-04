<?php

namespace Tests\Unit\Middleware;

use App\Http\Middleware\SetTestTimeMiddleware;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Tests\TestCase;

class SetTestTimeMiddlewareTest extends TestCase
{
    private SetTestTimeMiddleware $middleware;

    protected function setUp(): void
    {
        parent::setUp();
        $this->middleware = new SetTestTimeMiddleware;
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_sets_carbon_test_time_when_header_present_in_testing_env(): void
    {
        $request = Request::create('/api/v1/test', 'GET');
        $request->headers->set('X-Test-Time', '2026-04-02T14:30:00-06:00');

        $this->middleware->handle($request, function ($req) {
            return new Response('ok');
        });

        $testNow = Carbon::getTestNow();
        $this->assertNotNull($testNow);
        // -06:00 offset → UTC = 20:30:00
        $this->assertEquals('2026-04-02T20:30:00+00:00', $testNow->toIso8601String());
    }

    public function test_converts_test_time_to_utc(): void
    {
        $request = Request::create('/api/v1/test', 'GET');
        $request->headers->set('X-Test-Time', '2026-04-02T08:00:00+09:00');

        $this->middleware->handle($request, function ($req) {
            return new Response('ok');
        });

        $testNow = Carbon::getTestNow();
        $this->assertNotNull($testNow);
        // +09:00 → UTC = previous day 23:00
        $this->assertEquals('2026-04-01T23:00:00+00:00', $testNow->toIso8601String());
        $this->assertEquals('UTC', $testNow->timezoneName);
    }

    public function test_does_not_set_test_time_when_header_missing(): void
    {
        $request = Request::create('/api/v1/test', 'GET');

        $this->middleware->handle($request, function ($req) {
            return new Response('ok');
        });

        $this->assertNull(Carbon::getTestNow());
    }

    public function test_does_not_set_test_time_in_production_env(): void
    {
        $request = Request::create('/api/v1/test', 'GET');
        $request->headers->set('X-Test-Time', '2026-04-02T14:30:00-06:00');

        // Override isTestingEnvironment to simulate production
        $middleware = new class extends SetTestTimeMiddleware
        {
            protected function isTestingEnvironment(): bool
            {
                return false;
            }
        };

        $middleware->handle($request, function ($req) {
            return new Response('ok');
        });

        $this->assertNull(Carbon::getTestNow());
    }

    public function test_passes_request_to_next_middleware(): void
    {
        $request = Request::create('/api/v1/test', 'GET');
        $request->headers->set('X-Test-Time', '2026-04-02T14:30:00-06:00');

        $response = $this->middleware->handle($request, function ($req) {
            return new Response('next was called', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals('next was called', $response->getContent());
    }

    public function test_passes_request_through_without_header(): void
    {
        $request = Request::create('/api/v1/test', 'GET');

        $response = $this->middleware->handle($request, function ($req) {
            return new Response('passed through', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals('passed through', $response->getContent());
    }

    public function test_is_testing_environment_returns_true_for_testing(): void
    {
        // The test suite runs in 'testing' environment by default
        $this->assertEquals('testing', app()->environment());

        $request = Request::create('/api/v1/test', 'GET');
        $request->headers->set('X-Test-Time', '2026-01-01T00:00:00+00:00');

        $this->middleware->handle($request, function ($req) {
            return new Response('ok');
        });

        // If env check works, Carbon test time should be set
        $this->assertNotNull(Carbon::getTestNow());
    }
}
