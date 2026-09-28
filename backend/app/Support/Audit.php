<?php

namespace App\Support;

use App\Models\AdminAudit;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Str;

/**
 * The write side of the admin audit trail.
 *
 * Kept to one call so that adding a new admin action cannot accidentally ship
 * without a log line: every admin controller method ends in Audit::record().
 */
final class Audit
{
    /**
     * @param  array<string, array{from: mixed, to: mixed}>  $changes
     */
    public static function record(
        ?User $actor,
        string $action,
        string $subjectType,
        ?string $subjectId = null,
        array $changes = [],
    ): void {
        $row = [
            'actor_id' => $actor?->id,
            // Read off the actor rather than the request, so a role that
            // changes mid-session is recorded as it was at the time.
            'actor_role' => $actor?->role,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'changes' => $changes ?: null,
            'ip' => Request::ip(),
            'user_agent' => Str::limit((string) Request::userAgent(), 250, '') ?: null,
            'created_at' => now()->startOfSecond(),
        ];

        // Chained to the row before. The lock keeps two admins saving at the
        // same instant from both claiming the same predecessor.
        DB::transaction(function () use ($row): void {
            $prev = AdminAudit::query()->latest('id')->lockForUpdate()->value('hash');

            $audit = AdminAudit::create($row + [
                'prev_hash' => $prev,
                'hash' => self::seal($prev, $row),
            ]);

            if ($prev === null) {
                self::anchor($audit->id);
            }
        });
    }

    /**
     * Where the chain starts, kept outside the database.
     *
     * Without it, someone holding only the database could blank every hash
     * and the log would read as "written before the chain existed" rather
     * than broken. Written once, by the first chained row, and never again.
     */
    private static function anchor(?int $id = null): ?int
    {
        $path = (string) config('freshness.audit_anchor', storage_path('app/audit-chain-start'));

        if ($id !== null && ! is_file($path)) {
            @file_put_contents($path, (string) $id);
        }

        return is_file($path) ? (int) file_get_contents($path) : null;
    }

    /**
     * Walk the chain and say whether anything was changed or removed.
     *
     * Rows written before the chain existed have no hash; they are counted,
     * not judged. What the chain cannot show is rows cut off the *end* —
     * so the panel shows the count, and a count that goes down is the tell.
     *
     * @return array{intact: bool, checked: int, unchained: int, broken_at: int|null}
     */
    public static function verify(): array
    {
        $prev = null;
        $checked = 0;
        $unchained = 0;
        $started = false;

        // A log chained before the anchor file existed gets one now, from its
        // first hashed row.
        $firstChained = self::anchor()
            ?? self::anchor(AdminAudit::whereNotNull('hash')->min('id'));

        foreach (AdminAudit::query()->lazyById(500) as $audit) {
            // Rows written before the chain existed carry no hash, but only
            // up to the first chained row — whose id is kept outside the
            // database, so blanking every hash cannot pass the log off as old.
            if ($audit->hash === null && ! $started && ($firstChained === null || $audit->id < $firstChained)) {
                $unchained++;

                continue;
            }

            $started = true;
            $row = [
                'actor_id' => $audit->actor_id,
                'actor_role' => $audit->actor_role,
                'action' => $audit->action,
                'subject_type' => $audit->subject_type,
                'subject_id' => $audit->subject_id,
                'changes' => $audit->changes,
                'ip' => $audit->ip,
                'user_agent' => $audit->user_agent,
                'created_at' => $audit->created_at,
            ];

            $ok = $audit->hash !== null
                && $audit->prev_hash === $prev
                && hash_equals($audit->hash, self::seal($prev, $row));

            if (! $ok) {
                return ['intact' => false, 'checked' => $checked, 'unchained' => $unchained, 'broken_at' => $audit->id];
            }

            $prev = $audit->hash;
            $checked++;
        }

        // The chain was started and no chained row is left: everything from
        // the anchor on has been removed.
        if ($firstChained !== null && $checked === 0) {
            return ['intact' => false, 'checked' => 0, 'unchained' => $unchained, 'broken_at' => $firstChained];
        }

        return ['intact' => true, 'checked' => $checked, 'unchained' => $unchained, 'broken_at' => null];
    }

    /** HMAC over the previous hash and this row, keyed off APP_KEY. */
    private static function seal(?string $prev, array $row): string
    {
        $row['created_at'] = $row['created_at']?->format('Y-m-d H:i:s');
        $row['changes'] = $row['changes'] === null ? null : self::canonical($row['changes']);

        return hash_hmac(
            'sha256',
            ($prev ?? '').'|'.json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION),
            hash_hmac('sha256', 'freshness-audit-chain', (string) config('app.key'), true),
        );
    }

    /**
     * Keys sorted all the way down. MySQL's JSON type hands keys back in its
     * own order, so the hash must not depend on the order they went in.
     */
    private static function canonical(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }

        if (! array_is_list($value)) {
            ksort($value);
        }

        return array_map([self::class, 'canonical'], $value);
    }

    /**
     * What actually moved, as {field: {from, to}}.
     *
     * Called after fill() but before save(), while the model still knows both
     * sides. Returns an empty array when the edit was a no-op — which is the
     * point: a log full of "changed nothing" entries is a log nobody reads.
     *
     * @param  list<string>  $fields
     * @return array<string, array{from: mixed, to: mixed}>
     */
    public static function diff(Model $model, array $fields): array
    {
        $changes = [];

        foreach ($fields as $field) {
            if (! $model->isDirty($field)) {
                continue;
            }

            $changes[$field] = [
                'from' => $model->getOriginal($field),
                'to' => $model->getAttribute($field),
            ];
        }

        return $changes;
    }
}
