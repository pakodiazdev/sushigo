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

    public function test_sets_carbon_test_time_during_request_when_header_present(): void
    {
        $request = Request::create('/api/v1/test', 'GET');
        $request->headers->set('X-Test-Time', '2026-04-02T14:30:00-06:00');

        $capturedTime = null;
        $this->middleware->handle($request, function ($req) use (&$capturedTime) {
            $capturedTime = Carbon::getTestNow();

            return new Response('ok');
        });

        // Carbon test time was set during request (-06:00 → UTC = 20:30:00)
        $this->assertNotNull($capturedTime);
        $this->assertEquals('2026-04-02T20:30:00+00:00', $capturedTime->toIso8601String());
    }

    public function test_converts_test_time_to_utc(): void
    {
        $request = Request::create('/api/v1/test', 'GET');
        $request->headers->set('X-Test-Time', '2026-04-02T08:00:00+09:00');

        $capturedTime = null;
        $this->middleware->handle($request, function ($req) use (&$capturedTime) {
            $capturedTime = Carbon::getTestNow();

            return new Response('ok');
        });

        $this->assertNotNull($capturedTime);
        // +09:00 → UTC = previous day 23:00
        $this->assertEquals('2026-04-01T23:00:00+00:00', $capturedTime->toIso8601String());
        $this->assertEquals('UTC', $capturedTime->timezoneName);
    }

    public function test_restores_previous_test_time_after_request(): void
    {
        $request = Request::create('/api/v1/test', 'GET');
        $request->headers->set('X-Test-Time', '2026-04-02T14:30:00-06:00');

        // No previous test time set → should restore to null
        $this->middleware->handle($request, function ($req) {
            return new Response('ok');
        });

        $this->assertNull(Carbon::getTestNow());
    }

    public function test_restores_existing_test_time_after_request(): void
    {
        $previousTime = Carbon::parse('2026-01-01T00:00:00+00:00');
        Carbon::setTestNow($previousTime);

        $request = Request::create('/api/v1/test', 'GET');
        $request->headers->set('X-Test-Time', '2026-04-02T14:30:00-06:00');

        $this->middleware->handle($request, function ($req) {
            return new Response('ok');
        });

        // Should restore to the previous test time, not null
        $this->assertNotNull(Carbon::getTestNow());
        $this->assertEquals('2026-01-01T00:00:00+00:00', Carbon::getTestNow()->toIso8601String());
    }

    public function test_does_not_set_test_time_when_header_missing(): void
    {
        $request = Request::create('/api/v1/test', 'GET');

        $capturedTime = null;
        $this->middleware->handle($request, function ($req) use (&$capturedTime) {
            $capturedTime = Carbon::getTestNow();

            return new Response('ok');
        });

        $this->assertNull($capturedTime);
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

        $capturedTime = null;
        $middleware->handle($request, function ($req) use (&$capturedTime) {
            $capturedTime = Carbon::getTestNow();

            return new Response('ok');
        });

        $this->assertNull($capturedTime);
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

        $capturedTime = null;
        $this->middleware->handle($request, function ($req) use (&$capturedTime) {
            $capturedTime = Carbon::getTestNow();

            return new Response('ok');
        });

        // If env check works, Carbon test time should have been set during request
        $this->assertNotNull($capturedTime);
    }
}
