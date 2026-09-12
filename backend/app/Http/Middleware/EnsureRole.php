<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Staff-only routes.
 *
 * The role comes from the database row the token belongs to, never from the
 * request and never from the token's own abilities — a client that can choose
 * its abilities can choose to be an admin.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null || $user->isBlocked() || ! in_array($user->role, $roles, true)) {
            // 404, not 403. A customer poking at /api/staff should not learn
            // that the route exists and that they are merely the wrong kind of
            // person to use it.
            abort(404);
        }

        return $next($request);
    }
}
