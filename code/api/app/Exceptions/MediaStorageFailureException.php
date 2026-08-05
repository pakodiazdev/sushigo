<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when the storage disk fails to write an uploaded media file
 * (e.g. disk full, permissions) — config/filesystems.php sets 'throw' =>
 * false, so this must be raised explicitly instead of relying on the disk.
 */
class MediaStorageFailureException extends RuntimeException {}
