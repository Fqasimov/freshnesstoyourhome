<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\PushSender;
use App\Support\OrderPushMessage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Notify a customer that their order moved.
 *
 * Queued, because Expo's service is a network call and an order transition must
 * not wait on it — or fail because of it. A courier tapping "delivered" in a
 * basement should not see an error because a push could not be sent.
 */
class SendOrderPush implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        public readonly string $orderId,
        public readonly string $event,
    ) {}

    public function handle(PushSender $sender): void
    {
        $order = Order::with('user')->find($this->orderId);

        if ($order === null || $order->user === null) {
            return;
        }

        // A deleted account has no devices; anonymise() removed them.
        $tokens = $order->user->pushTokens()->get();

        if ($tokens->isEmpty()) {
            return;
        }

        $locale = $order->user->locale ?: 'az';

        $message = $this->event === 'weighed'
            ? OrderPushMessage::forWeighed($order, $locale)
            : OrderPushMessage::forStatus($order, $this->event, $locale);

        if ($message === null) {
            return;
        }

        $sender->send($tokens, $message['title'], $message['body'], [
            // What the app needs to open the right screen when tapped. An id
            // and a code — nothing that would be worth intercepting.
            'type' => 'order',
            'order_id' => $order->id,
            'code' => $order->code,
        ]);
    }
}
