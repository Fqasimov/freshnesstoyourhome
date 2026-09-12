<?php

namespace App\Support;

use App\Models\AdminAudit;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

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
        AdminAudit::create([
            'actor_id' => $actor?->id,
            // Read off the actor rather than the request, so a role that
            // changes mid-session is recorded as it was at the time.
            'actor_role' => $actor?->role,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'changes' => $changes ?: null,
            'ip' => Request::ip(),
        ]);
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
