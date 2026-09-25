<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RequestLoginCodeRequest;
use App\Http\Requests\Auth\VerifyLoginCodeRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\LoginCodeService;
use App\Support\AdminAccess;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

/**
 * Sign-in for the admin panel, and only for the addresses in ADMIN_EMAILS.
 *
 * Separate from the shop's sign-in on purpose. The shop's endpoint mails a
 * code to anyone and makes an account for anyone, which is right for a shop
 * and wrong for /cms: typing a stranger's address there should do nothing at
 * all — no mail, no account, no row.
 *
 * Both endpoints answer an unnamed address exactly as they answer a named
 * one, so the panel does not tell anyone which address is the admin's.
 */
class PanelAuthController extends Controller
{
    public function __construct(private readonly LoginCodeService $codes) {}

    public function requestCode(RequestLoginCodeRequest $request): JsonResponse
    {
        $email = $request->string('email')->toString();

        if (AdminAccess::isNamed($email)) {
            $this->codes->issue($email, $request->ip(), 'az');
        }

        return response()->json([
            'status' => 'ok',
            'message' => 'If that address may use the panel, a sign-in code is on the way.',
        ]);
    }

    public function verifyCode(VerifyLoginCodeRequest $request): JsonResponse
    {
        $email = $request->string('email')->toString();

        if (! AdminAccess::isNamed($email)) {
            // Spend what a real check costs, so the answer for an unnamed
            // address does not come back measurably faster than a wrong code.
            Hash::check($request->string('code')->toString(), Hash::make('not-a-code'));

            return $this->refused();
        }

        $user = $this->codes->verify($email, $request->string('code')->toString());

        if ($user === null) {
            return $this->refused();
        }

        // The address is named in the server's own configuration, which only
        // someone with the server's files can change; the role follows it so
        // the audit trail says who acted as what. Nothing a caller sends can
        // reach this line for an address the server has not named.
        if (! $user->isAdmin()) {
            $was = $user->role;
            $user->promote(User::ROLE_ADMIN);
            Audit::record(null, 'user.promote', 'user', $user->id, [
                'role' => ['from' => $was, 'to' => User::ROLE_ADMIN],
                'via' => 'ADMIN_EMAILS',
            ]);
        }

        $token = $user->createToken(
            'admin-panel',
            [AdminAccess::ABILITY],
            now()->addHours((int) config('freshness.admin.token_ttl_hours')),
        );

        return response()->json([
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at,
            'user' => new UserResource($user),
        ]);
    }

    private function refused(): JsonResponse
    {
        return response()->json([
            'message' => 'That code is not valid. Request a new one.',
        ], 422);
    }
}
