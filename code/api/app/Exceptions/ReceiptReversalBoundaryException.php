<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a posted Receipt cannot be reversed because the stock it
 * added has since been consumed below the quantity it received — reversing
 * would drive on_hand negative. This is the "reversal boundary" #432 asks
 * for: reuses Stock's own guarded decreaseOnHand() invariant (see #430)
 * rather than inventing a new business rule.
 */
class ReceiptReversalBoundaryException extends RuntimeException {}
