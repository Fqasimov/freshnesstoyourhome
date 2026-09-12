<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * A blocked or deleted account cannot use a token it was issued earlier.
 *
 * Revoking tokens at the moment of blocking is not enough on its own: a token
 * issued seconds before, or a race between the two, would otherwise keep
 * working until it expired. This is checked on every authenticated request.
 */
class EnsureNotBlocked
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && ($user->isBlocked() || $user->anonymised_at !== null)) {
            $user->tokens()->delete();

            return response()->json(['message' => 'This account is no longer active.'], 401);
        }

        return $next($request);
    }
}
