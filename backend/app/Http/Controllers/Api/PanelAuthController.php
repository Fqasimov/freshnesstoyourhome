<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RequestLoginCodeRequest;
use App\Http\Requests\Auth\VerifyLoginCodeRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\LoginCodeService;
use App\Services\TwoFactor;
use App\Support\AdminAccess;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
 *
 * Two factors, in order: a code mailed to the named inbox, then a code from
 * the admin's authenticator app. The first only earns a short-lived ticket;
 * no token exists until the second is right. The first time through, the
 * second step is enrolment — scan, prove it works, keep the recovery codes.
 */
class PanelAuthController extends Controller
{
    /** How long the ticket from the email step lasts, and how many tries it gets. */
    private const TICKET_MINUTES = 5;
    private const TICKET_ATTEMPTS = 5;

    public function __construct(
        private readonly LoginCodeService $codes,
        private readonly TwoFactor $twoFactor,
    ) {}

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

        // Past the first factor. Nothing here is a session yet: a ticket that
        // lasts five minutes, allows five tries, and opens only the second step.
        $ticket = Str::random(48);
        Cache::put($this->ticketKey($ticket), ['user' => $user->id, 'attempts' => 0], now()->addMinutes(self::TICKET_MINUTES));

        if ($user->hasTwoFactor()) {
            return response()->json(['two_factor' => 'challenge', 'ticket' => $ticket]);
        }

        $secret = $this->twoFactor->begin($user);

        return response()->json([
            'two_factor' => 'enroll',
            'ticket' => $ticket,
            'secret' => $secret,
            'otpauth' => $this->twoFactor->otpauthUri($user, $secret),
        ]);
    }

    /**
     * The second factor: a code from the app, or one recovery code.
     *
     * Enrolling and signing in are the same request; which one it is depends
     * only on whether the account has a confirmed secret, which the server
     * knows and the caller does not choose.
     */
    public function twoFactor(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ticket' => ['required', 'string', 'size:48'],
            'code' => ['required_without:recovery_code', 'nullable', 'string', 'max:10'],
            'recovery_code' => ['required_without:code', 'nullable', 'string', 'max:20'],
        ]);

        $key = $this->ticketKey($data['ticket']);
        $ticket = Cache::get($key);
        $user = $ticket ? User::find($ticket['user']) : null;

        // Re-checked here rather than trusted from the first step: an address
        // taken out of ADMIN_EMAILS, or an account blocked, in the minutes in
        // between is out.
        if ($user === null || $user->isBlocked() || ! AdminAccess::isNamed((string) $user->email)) {
            Cache::forget($key);

            return $this->expired();
        }

        $enrolling = ! $user->hasTwoFactor();

        $passed = match (true) {
            filled($data['code'] ?? null) => $this->twoFactor->check($user, trim($data['code'])),
            ! $enrolling => $this->twoFactor->useRecoveryCode($user, $data['recovery_code']),
            default => false,
        };

        if (! $passed) {
            $ticket['attempts']++;
            $ticket['attempts'] >= self::TICKET_ATTEMPTS
                ? Cache::forget($key)
                : Cache::put($key, $ticket, now()->addMinutes(self::TICKET_MINUTES));

            return response()->json([
                'message' => 'That code is not right. Check the app and try again.',
            ], 422);
        }

        Cache::forget($key);

        $recovery = null;
        if ($enrolling) {
            $recovery = $this->twoFactor->confirm($user);
            Audit::record($user, 'admin.two_factor_on', 'user', $user->id);
        }

        // Every panel sign-in is on the record, with where it came from — so
        // one the admin does not recognise shows up in the journal.
        Audit::record($user, 'admin.sign_in', 'user', $user->id, array_filter([
            'via' => filled($data['code'] ?? null) ? 'app' : 'recovery_code',
            'recovery_codes_left' => filled($data['recovery_code'] ?? null)
                ? count($user->two_factor_recovery_codes ?? [])
                : null,
        ], fn ($v) => $v !== null));

        $token = $user->createToken(
            'admin-panel',
            [AdminAccess::ABILITY],
            now()->addHours((int) config('freshness.admin.token_ttl_hours')),
        );

        return response()->json(array_filter([
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at,
            'user' => new UserResource($user),
            // Shown once, at enrolment, and never again.
            'recovery_codes' => $recovery,
        ], fn ($v) => $v !== null));
    }

    private function ticketKey(string $ticket): string
    {
        return 'panel-2fa:'.hash('sha256', $ticket);
    }

    private function expired(): JsonResponse
    {
        return response()->json([
            'message' => 'This sign-in has expired. Start again with your email.',
        ], 422);
    }

    private function refused(): JsonResponse
    {
        return response()->json([
            'message' => 'That code is not valid. Request a new one.',
        ], 422);
    }
}
