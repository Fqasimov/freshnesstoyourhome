<?php

namespace App\Services;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * A business-rule refusal, rendered as 422 rather than a 500.
 *
 * "Your basket is empty" and "the shop is closed" are normal answers, not
 * faults — the client should show the message to the customer.
 */
class OrderRejected extends Exception
{
    public function __construct(string $message, private readonly array $context = [])
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()] + $this->context, 422);
    }
}
