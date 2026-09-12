<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Customers, seen as narrowly as the job allows.
 *
 * Names, addresses, phone numbers and email addresses are encrypted at rest.
 * An admin token that could page through all of them in the clear would undo
 * that: the encryption would still be perfect and the data would still be
 * gone. So the list masks contact details and only the detail view — one
 * customer at a time, and written to the audit trail — shows them in full.
 *
 * Roles are not editable here on purpose. Appointing staff is a console
 * command an operator runs on the server; making it a button is how an admin
 * session that leaks becomes a permanent one.
 */
class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'email' => ['sometimes', 'nullable', 'string', 'max:120'],
            'blocked' => ['sometimes', 'boolean'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        // Looked up through the blind index, so the address never appears in a
        // query, a slow-query log or a database backup's WHERE clause.
        if ($email = trim((string) ($filters['email'] ?? ''))) {
            $user = User::findByEmail($email);

            return response()->json([
                'data' => $user ? [$this->summary($user)] : [],
                'total' => $user ? 1 : 0,
            ]);
        }

        $users = User::query()
            ->when($filters['blocked'] ?? null, fn ($q) => $q->whereNotNull('blocked_at'))
            ->withCount('orders')
            ->latest('created_at')
            ->paginate(30);

        return response()->json([
            'data' => collect($users->items())->map(fn (User $u) => $this->summary($u)),
            'total' => $users->total(),
            'page' => $users->currentPage(),
            'last_page' => $users->lastPage(),
        ]);
    }

    /**
     * One customer, in full, and logged.
     *
     * The log line is the point. Reading a customer's phone number to call
     * them about a delayed order is normal; reading four hundred of them in an
     * afternoon is not, and only a record of the looking can tell them apart.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = User::withCount('orders')->findOrFail($id);

        Audit::record($request->user(), 'customer.view', 'user', $user->id);

        $orders = Order::where('user_id', $user->id)
            ->latest('placed_at')
            ->limit(20)
            ->get();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'locale' => $user->locale,
            'blocked_at' => $user->blocked_at,
            'anonymised_at' => $user->anonymised_at,
            'last_login_at' => $user->last_login_at,
            'created_at' => $user->created_at,
            'orders_count' => $user->orders_count,
            'spent_minor' => (int) $orders->where('status', Order::DELIVERED)
                ->sum(fn (Order $o) => $o->payableMinor()),
            'orders' => $orders->map(fn (Order $o) => [
                'id' => $o->id,
                'status' => $o->status,
                'delivery_date' => $o->delivery_date?->toDateString(),
                'total_minor' => $o->payableMinor(),
            ]),
        ]);
    }

    /**
     * Block or unblock.
     *
     * Blocking bites immediately: the `blocked` middleware sits on every
     * signed-in route, and their tokens are destroyed here so the next request
     * from an open app is rejected rather than merely the next sign-in.
     */
    public function block(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['blocked' => ['required', 'boolean']]);

        $user = User::findOrFail($id);

        if ($user->is($request->user())) {
            throw ValidationException::withMessages([
                'blocked' => 'You cannot block your own account.',
            ]);
        }

        // An admin locking out another admin is a fight this endpoint should
        // not be able to start. Staff are appointed from the console; they are
        // stood down from there too.
        if ($user->role !== User::ROLE_CUSTOMER) {
            throw ValidationException::withMessages([
                'blocked' => 'Staff accounts are managed from the server console.',
            ]);
        }

        $was = $user->blocked_at;
        $user->forceFill(['blocked_at' => $data['blocked'] ? now() : null])->save();

        if ($data['blocked']) {
            $user->tokens()->delete();
        }

        Audit::record($request->user(), $data['blocked'] ? 'customer.block' : 'customer.unblock', 'user', $user->id, [
            'blocked_at' => ['from' => $was, 'to' => $user->blocked_at],
        ]);

        return response()->json(['status' => 'ok', 'blocked_at' => $user->blocked_at]);
    }

    /**
     * Contact details, reduced to what identifies a row without exposing it.
     *
     * @return array<string, mixed>
     */
    private function summary(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email_masked' => self::maskEmail($u->email),
            'phone_masked' => self::maskPhone($u->phone),
            'role' => $u->role,
            'blocked_at' => $u->blocked_at,
            'anonymised_at' => $u->anonymised_at,
            'orders_count' => $u->orders_count ?? 0,
            'created_at' => $u->created_at,
        ];
    }

    private static function maskEmail(?string $email): ?string
    {
        if (blank($email) || ! str_contains($email, '@')) {
            return null;
        }

        [$local, $domain] = explode('@', $email, 2);

        return mb_substr($local, 0, 2).str_repeat('•', max(1, mb_strlen($local) - 2)).'@'.$domain;
    }

    private static function maskPhone(?string $phone): ?string
    {
        if (blank($phone)) {
            return null;
        }

        return str_repeat('•', max(0, mb_strlen($phone) - 4)).mb_substr($phone, -4);
    }
}
