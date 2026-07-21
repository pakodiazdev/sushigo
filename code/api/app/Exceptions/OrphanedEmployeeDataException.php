<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a migration would irrecoverably lose employee data because
 * one or more employees have no linked user (user_id IS NULL).
 */
class OrphanedEmployeeDataException extends RuntimeException {}
