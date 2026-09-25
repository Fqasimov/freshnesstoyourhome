<?php

namespace App\Services;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Checks a "Sign in with Google" or "Sign in with Apple" ID token.
 *
 * The phone hands us a signed token from the provider; nothing about it is
 * taken on the phone's word. The signature is checked against the provider's
 * published keys, and then who issued it, who it was issued *for* (our own
 * client ids — a token minted for somebody else's app must not open ours),
 * and that it has not expired.
 *
 * Returns the claims we use, or null.
 */
class SocialTokenVerifier
{
    private const PROVIDERS = [
        'google' => [
            'keys' => 'https://www.googleapis.com/oauth2/v3/certs',
            'issuers' => ['accounts.google.com', 'https://accounts.google.com'],
        ],
        'apple' => [
            'keys' => 'https://appleid.apple.com/auth/keys',
            'issuers' => ['https://appleid.apple.com'],
        ],
    ];

    public function enabled(string $provider): bool
    {
        return $this->audiences($provider) !== [];
    }

    /** @return array{sub: string, email: ?string, email_verified: bool, name: ?string}|null */
    public function verify(string $provider, string $idToken): ?array
    {
        $spec = self::PROVIDERS[$provider] ?? null;
        $audiences = $this->audiences($provider);

        if ($spec === null || $audiences === []) {
            return null;
        }

        $claims = $this->decode($provider, $spec['keys'], $idToken);

        if ($claims === null) {
            return null;
        }

        $aud = (array) ($claims['aud'] ?? []);

        if (! in_array($claims['iss'] ?? null, $spec['issuers'], true)
            || array_intersect($aud, $audiences) === []
            || ! is_string($claims['sub'] ?? null) || $claims['sub'] === '') {
            return null;
        }

        // Apple sends "true" as a string; Google sends a boolean.
        $verified = filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);

        return [
            'sub' => $claims['sub'],
            'email' => is_string($claims['email'] ?? null) ? $claims['email'] : null,
            'email_verified' => $verified,
            'name' => is_string($claims['name'] ?? null) ? $claims['name'] : null,
        ];
    }

    private function decode(string $provider, string $url, string $idToken): ?array
    {
        JWT::$leeway = 60;

        foreach ([false, true] as $refetch) {
            try {
                if ($refetch) {
                    Cache::forget("social-keys:{$provider}");
                }

                return (array) JWT::decode($idToken, JWK::parseKeySet($this->keys($provider, $url), 'RS256'));
            } catch (Throwable) {
                // Try once more with fresh keys, in case they rotated.
            }
        }

        return null;
    }

    /** @return list<string> */
    private function audiences(string $provider): array
    {
        return config("freshness.social.{$provider}", []);
    }

    /**
     * The provider's signing keys, cached for a few hours. Both rotate them,
     * so a token signed with a key we have not seen refetches once.
     */
    private function keys(string $provider, string $url): array
    {
        $key = "social-keys:{$provider}";

        return Cache::remember($key, now()->addHours(6), function () use ($url) {
            return Http::timeout(8)->acceptJson()->get($url)->throw()->json();
        });
    }
}
