<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PushTokenController extends Controller
{
    /**
     * Register this device for order updates.
     *
     * Idempotent: the app calls it on every launch, because a push token can be
     * reissued by the OS at any time and a stale one silently stops working.
     *
     * If the token already exists against a different account — the same phone,
     * a different customer — it moves. Leaving it would send one person's order
     * updates to a phone that is now someone else's.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:255'],
            'platform' => ['sometimes', Rule::in(['ios', 'android'])],
            'device_name' => ['sometimes', 'nullable', 'string', 'max:60'],
        ]);

        if (! PushToken::looksValid($data['token'])) {
            return response()->json(['message' => 'That is not an Expo push token.'], 422);
        }

        $token = DB::transaction(function () use ($data, $request) {
            $row = PushToken::firstOrNew(['token' => $data['token']]);

            // forceFill, because `user_id` is deliberately not fillable: there
            // must be no path where a request body names the account a device
            // belongs to. The owner comes from the access token and nowhere
            // else.
            $row->forceFill([
                'user_id' => $request->user()->id,
                'platform' => $data['platform'] ?? null,
                'device_name' => $data['device_name'] ?? null,
                'failures' => 0,
                'last_used_at' => now(),
            ])->save();

            return $row;
        });

        return response()->json(['status' => 'registered', 'id' => $token->id], 201);
    }

    /**
     * Stop sending to this device.
     *
     * Used when the customer turns notifications off in the app, and on sign
     * out — a shared or sold phone should not keep receiving someone's orders.
     * Scoped through the relation, so a token belonging to another account is
     * simply not found.
     */
    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string', 'max:255']]);

        $request->user()->pushTokens()->where('token', $data['token'])->delete();

        // 200 whether or not a row existed: the caller wanted this device to
        // stop receiving notifications, and it will.
        return response()->json(['status' => 'unregistered']);
    }
}
