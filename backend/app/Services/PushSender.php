<?php

namespace App\Services;

use App\Models\PushToken;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Delivery to Expo's push service.
 *
 * Expo relays to APNs and FCM, so we hold no Apple or Google credentials —
 * which is the main reason to use it. The only thing this needs to get right is
 * housekeeping: a push token dies when the app is uninstalled, when the OS
 * reissues it, or when the device is wiped, and Expo says so in the response.
 * A service that ignores that accumulates dead tokens forever and eventually
 * gets rate limited for shouting into the void.
 */
class PushSender
{
    private const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

    /** Expo accepts at most 100 messages per request. */
    private const CHUNK = 100;

    /**
     * @param  Collection<int, PushToken>  $tokens
     * @param  array<string, mixed>  $data  delivered to the app when tapped
     */
    public function send(Collection $tokens, string $title, string $body, array $data = []): void
    {
        if ($tokens->isEmpty()) {
            return;
        }

        foreach ($tokens->chunk(self::CHUNK) as $chunk) {
            $this->sendChunk($chunk->values(), $title, $body, $data);
        }
    }

    /** @param  Collection<int, PushToken>  $chunk */
    private function sendChunk(Collection $chunk, string $title, string $body, array $data): void
    {
        $messages = $chunk->map(fn (PushToken $t) => array_filter([
            'to' => $t->token,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'sound' => 'default',
            // An order update is worth waking the screen for; it is time
            // sensitive and the customer asked for it.
            'priority' => 'high',
            // Must match the channel the app creates, or Android silently
            // drops it into a default channel with no sound.
            'channelId' => 'orders',
        ], fn ($v) => $v !== null && $v !== []))->all();

        try {
            $response = Http::asJson()
                ->acceptJson()
                ->timeout(15)
                // Expo's service is occasionally slow rather than broken.
                ->retry(2, 500, throw: false)
                ->post(self::ENDPOINT, $messages);
        } catch (Throwable $e) {
            // Never let a notification failure break the thing that triggered
            // it. An order must still transition if the push service is down.
            Log::warning('Push send failed: '.$e->getMessage());

            return;
        }

        if (! $response->successful()) {
            Log::warning('Push service returned '.$response->status(), [
                'body' => mb_substr($response->body(), 0, 500),
            ]);

            return;
        }

        $this->handleReceipts($chunk, (array) $response->json('data', []));
    }

    /**
     * Act on what Expo said about each message.
     *
     * The one that matters is DeviceNotRegistered: the app is gone from that
     * device and the token will never work again, so it is deleted rather than
     * retried. Everything else is logged and the failure counted.
     *
     * @param  Collection<int, PushToken>  $chunk
     */
    private function handleReceipts(Collection $chunk, array $receipts): void
    {
        foreach ($receipts as $i => $receipt) {
            $token = $chunk->get($i);
            if ($token === null) {
                continue;
            }

            if (($receipt['status'] ?? null) === 'ok') {
                $token->forceFill(['failures' => 0, 'last_used_at' => now()])->save();

                continue;
            }

            $error = $receipt['details']['error'] ?? null;

            if ($error === 'DeviceNotRegistered') {
                $token->delete();

                continue;
            }

            // MessageRateExceeded, MessageTooBig, InvalidCredentials and the
            // like. Count it; a token that fails repeatedly is dropped so the
            // table does not fill with addresses that never work.
            $token->increment('failures');

            if ($token->failures >= 10) {
                $token->delete();

                continue;
            }

            Log::info('Push not delivered', [
                'error' => $error,
                'message' => $receipt['message'] ?? null,
            ]);
        }
    }
}
