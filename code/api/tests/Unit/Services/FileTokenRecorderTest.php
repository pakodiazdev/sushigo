<?php

namespace Tests\Unit\Services;

use App\Services\Testing\FileTokenRecorder;
use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FileTokenRecorderTest extends TestCase
{
    private FileTokenRecorder $recorder;

    private string $testDirectory;

    protected function setUp(): void
    {
        parent::setUp();

        // Enable the flag for all tests (simulates LOG_RESET_LINK=true)
        config(['app.log_reset_link' => true]);

        $this->recorder = new FileTokenRecorder;
        $this->testDirectory = storage_path('testing/reset-links');
    }

    protected function tearDown(): void
    {
        // Clean up test files
        if (File::isDirectory($this->testDirectory)) {
            File::deleteDirectory($this->testDirectory);
        }

        parent::tearDown();
    }

    #[Test]
    public function records_and_retrieves_a_reset_link(): void
    {
        $email = 'test@example.com';
        $link = 'https://sushigo.local/reset-password?token=abc123';

        $this->recorder->record($email, $link);

        $this->assertSame($link, $this->recorder->retrieve($email));
    }

    #[Test]
    public function returns_null_for_unknown_email(): void
    {
        $this->assertNull($this->recorder->retrieve('unknown@example.com'));
    }

    #[Test]
    public function overwrites_existing_link_for_same_email(): void
    {
        $email = 'overwrite@example.com';

        $this->recorder->record($email, 'https://first-link.com');
        $this->recorder->record($email, 'https://second-link.com');

        $this->assertSame('https://second-link.com', $this->recorder->retrieve($email));
    }

    #[Test]
    public function clear_removes_all_recorded_links(): void
    {
        $this->recorder->record('a@example.com', 'https://link-a.com');
        $this->recorder->record('b@example.com', 'https://link-b.com');

        $this->recorder->clear();

        $this->assertNull($this->recorder->retrieve('a@example.com'));
        $this->assertNull($this->recorder->retrieve('b@example.com'));
    }

    #[Test]
    public function clear_does_not_fail_when_directory_does_not_exist(): void
    {
        // Ensure directory doesn't exist
        if (File::isDirectory($this->testDirectory)) {
            File::deleteDirectory($this->testDirectory);
        }

        // Should not throw
        $this->recorder->clear();
        $this->assertFalse(File::isDirectory($this->testDirectory));
    }

    #[Test]
    public function handles_emails_with_special_characters_without_collisions(): void
    {
        $email1 = 'user+1@example.com';
        $email2 = 'user_1@example.com';

        $this->recorder->record($email1, 'https://link-plus.com');
        $this->recorder->record($email2, 'https://link-underscore.com');

        // Both should be independently retrievable (no collision)
        $this->assertSame('https://link-plus.com', $this->recorder->retrieve($email1));
        $this->assertSame('https://link-underscore.com', $this->recorder->retrieve($email2));
    }

    #[Test]
    public function creates_directory_if_it_does_not_exist(): void
    {
        // Ensure directory doesn't exist
        if (File::isDirectory($this->testDirectory)) {
            File::deleteDirectory($this->testDirectory);
        }

        $this->recorder->record('new@example.com', 'https://link.com');

        $this->assertTrue(File::isDirectory($this->testDirectory));
        $this->assertSame('https://link.com', $this->recorder->retrieve('new@example.com'));
    }

    #[Test]
    public function does_not_record_when_flag_is_disabled(): void
    {
        config(['app.log_reset_link' => false]);

        $this->recorder->record('disabled@example.com', 'https://should-not-be-written.com');

        $this->assertNull($this->recorder->retrieve('disabled@example.com'));
    }
}
