<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RequestLoginCodeRequest;
use App\Http\Requests\Auth\VerifyLoginCodeRequest;
use App\Http\Resources\UserResource;
use App\Services\LoginCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly LoginCodeService $codes) {}

    /**
     * Send a sign-in code.
     *
     * Always answers the same way. Whether the address belongs to a customer,
     * has never been seen, or has just run out of its hourly budget, the
     * caller gets one message: if that address can receive mail, a code is on
     * its way. Anything more specific turns this endpoint into a way to ask
     * whether a given person shops here.
     */
    public function requestCode(RequestLoginCodeRequest $request): JsonResponse
    {
        $this->codes->issue(
            $request->string('email')->toString(),
            $request->ip(),
            $request->string('locale', 'az')->toString(),
        );

        return response()->json([
            'status' => 'ok',
            'message' => 'If that address can receive mail, a sign-in code is on the way.',
        ]);
    }

    /**
     * Exchange a code for an API token.
     *
     * A correct code proves control of the address, so this both signs in an
     * existing customer and registers a new one. `profile_complete` tells the
     * app whether it still has to collect a name and phone before the customer
     * can order — the server enforces that at checkout regardless.
     */
    public function verifyCode(VerifyLoginCodeRequest $request): JsonResponse
    {
        $user = $this->codes->verify(
            $request->string('email')->toString(),
            $request->string('code')->toString(),
        );

        if ($user === null) {
            // One message for wrong, expired, already-used, out-of-attempts
            // and blocked. Each distinct message would tell a guesser
            // something about an account that is not theirs.
            return response()->json([
                'message' => 'That code is not valid. Request a new one.',
            ], 422);
        }

        // 'customer', never '*': a wildcard token would satisfy the admin
        // check too. Admin tokens come only from PanelAuthController.
        $token = $user->createToken(
            $request->string('device_name', 'app')->toString(),
            ['customer'],
            now()->addDays((int) config('freshness.auth.token_ttl_days')),
        );

        return response()->json([
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at,
            'user' => new UserResource($user),
        ]);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    /** Sign out this device only, leaving the customer's other devices alone. */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['status' => 'ok']);
    }

    /** Sign out everywhere — what a customer wants after losing a phone. */
    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json(['status' => 'ok']);
    }

    /**
     * Delete the account, from inside the app.
     *
     * Apple requires this (Guideline 5.1.1(v)) and a customer is entitled to
     * it. It is a real erasure of personal data, not a flag: see
     * User::anonymise(). The financial record of past orders survives without
     * the person attached to it, because the shop still has to be able to
     * account for what it sold.
     *
     * There is no undo, so the client must confirm before calling this.
     */
    public function deleteAccount(Request $request): JsonResponse
    {
        $user = $request->user();

        // An order that is already on its way cannot be abandoned by deleting
        // the account — someone is about to knock on a door with goods.
        $live = $user->orders()
            ->whereIn('status', ['placed', 'confirmed', 'preparing', 'out_for_delivery'])
            ->exists();

        if ($live) {
            return response()->json([
                'message' => 'You have an order in progress. It has to be delivered or cancelled before the account can be deleted.',
            ], 409);
        }

        $user->anonymise();

        return response()->json(['status' => 'deleted']);
    }
}
