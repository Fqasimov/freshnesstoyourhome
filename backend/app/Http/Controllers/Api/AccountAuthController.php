<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\RegistrationService;
use App\Services\SocialTokenVerifier;
use App\Support\BlindIndex;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * The app's accounts: sign up, sign in with a password, Google and Apple.
 *
 * The emailed six-digit code is still what proves an address. Sign-up and
 * password reset both end in it, and no account exists until it is typed
 * back — see RegistrationService.
 */
class AccountAuthController extends Controller
{
    public function __construct(
        private readonly RegistrationService $accounts,
        private readonly SocialTokenVerifier $social,
    ) {}

    /** Step one of sign-up: hold the form, email the code. */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'date_of_birth' => [
                'required', 'date_format:Y-m-d',
                'after_or_equal:1900-01-01',
                // Thirteen: the age below which an online shop may not hold
                // a child's data without a parent (and the stores' own line).
                'before_or_equal:'.now()->subYears(13)->toDateString(),
            ],
            'password' => ['required', 'string', 'max:128', 'confirmed', $this->passwordRule()],
            'locale' => ['sometimes', Rule::in(['az', 'ru', 'en'])],
        ], [
            'date_of_birth.before_or_equal' => 'You must be at least 13 to open an account.',
        ]);

        $ticket = $this->accounts->start(RegistrationService::REGISTER, $data['email'], $data, $request->ip());

        return $this->codeSent($ticket);
    }

    /** Forgot password: the same shape, finished by the same code. */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'password' => ['required', 'string', 'max:128', 'confirmed', $this->passwordRule()],
            'locale' => ['sometimes', Rule::in(['az', 'ru', 'en'])],
        ]);

        $ticket = $this->accounts->start(RegistrationService::RESET, $data['email'], $data, $request->ip());

        return $this->codeSent($ticket);
    }

    /** Step two: the code. Only now does the account exist. */
    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ticket' => ['required', 'string', 'size:48'],
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'code' => ['required', 'string', 'digits:6'],
            'device_name' => ['sometimes', 'string', 'max:60'],
        ]);

        $done = $this->accounts->confirm($data['ticket'], $data['email'], $data['code']);

        if ($done === null) {
            return response()->json(['message' => 'That code is not valid. Check it, or send a new one.'], 422);
        }

        return $this->signedIn($done['user'], $data['device_name'] ?? 'app', $done['created'] ? 201 : 200);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'password' => ['required', 'string', 'max:128'],
            'device_name' => ['sometimes', 'string', 'max:60'],
        ]);

        $user = $this->accounts->attempt($data['email'], $data['password']);

        if ($user === null) {
            return response()->json(['message' => 'The email or password is not right.'], 422);
        }

        return $this->signedIn($user, $data['device_name'] ?? 'app');
    }

    /**
     * Sign in with Google or Apple.
     *
     * The provider has already confirmed the address, so there is no code:
     * a verified address from Google or Apple is the same proof the code is.
     * An unverified one is refused rather than trusted.
     */
    public function social(Request $request, string $provider): JsonResponse
    {
        abort_unless(in_array($provider, ['google', 'apple'], true), 404);

        $data = $request->validate([
            'id_token' => ['required', 'string', 'max:4096'],
            // Apple gives the name to the app, once, and never puts it in the token.
            'name' => ['sometimes', 'nullable', 'string', 'max:80'],
            'locale' => ['sometimes', Rule::in(['az', 'ru', 'en'])],
            'device_name' => ['sometimes', 'string', 'max:60'],
        ]);

        if (! $this->social->enabled($provider)) {
            return response()->json(['message' => 'This sign-in option is not available yet.'], 503);
        }

        $claims = $this->social->verify($provider, $data['id_token']);

        if ($claims === null) {
            return response()->json(['message' => 'That sign-in could not be confirmed. Try again.'], 422);
        }

        $column = $provider.'_id_hash';
        $hash = BlindIndex::ofProvider($provider, $claims['sub']);

        $user = User::where($column, $hash)->first();

        if ($user === null) {
            if ($claims['email'] === null || ! $claims['email_verified']) {
                return response()->json(['message' => 'Your account there has no confirmed email address.'], 422);
            }

            // Same address as an existing account: it is the same person.
            $user = User::findByEmail($claims['email'])
                ?? new User(['email' => $claims['email'], 'locale' => $data['locale'] ?? 'az']);

            $user->name ??= $claims['name'] ?: ($data['name'] ?? null);
            $user->email_verified_at ??= now();
            $user->forceFill([$column => $hash]);
        }

        if ($user->isBlocked()) {
            return response()->json(['message' => 'That sign-in could not be confirmed. Try again.'], 422);
        }

        $created = ! $user->exists;
        $user->last_login_at = now();
        $user->save();

        return $this->signedIn($user, $data['device_name'] ?? 'app', $created ? 201 : 200);
    }

    /** At least 8, upper and lower case, a digit and a symbol. */
    private function passwordRule(): Password
    {
        return Password::min(8)->mixedCase()->numbers()->symbols();
    }

    private function codeSent(string $ticket): JsonResponse
    {
        return response()->json([
            'status' => 'code_sent',
            'ticket' => $ticket,
            'expires_in_minutes' => (int) config('freshness.auth.code_ttl_minutes'),
        ]);
    }

    private function signedIn(User $user, string $device, int $status = 200): JsonResponse
    {
        // 'customer', never '*': a wildcard would satisfy the admin check.
        $token = $user->createToken($device, ['customer'], now()->addDays((int) config('freshness.auth.token_ttl_days')));

        return response()->json([
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at,
            'user' => new UserResource($user),
        ], $status);
    }
}
