<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when clock simulation is misconfigured (e.g., production in allowed envs).
 */
class ClockSimulationMisconfigurationException extends RuntimeException {}
