<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\AdminAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Staff-only routes.
 *
 * The role comes from the database row the token belongs to, never from the
 * request. For admin that is necessary but not enough: see AdminAccess, which
 * also wants the address named in ADMIN_EMAILS and a token from the panel's
 * own sign-in. The token ability is only ever set by the server, at that one
 * sign-in; it narrows what a token can do and never widens it.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        $allowed = $user !== null && ! $user->isBlocked() && (
            $user->isAdmin()
                ? in_array(User::ROLE_ADMIN, $roles, true) && AdminAccess::granted($user)
                : in_array($user->role, $roles, true)
        );

        if (! $allowed) {
            // 404, not 403. A customer poking at /api/staff should not learn
            // that the route exists and that they are merely the wrong kind of
            // person to use it.
            abort(404);
        }

        return $next($request);
    }
}
