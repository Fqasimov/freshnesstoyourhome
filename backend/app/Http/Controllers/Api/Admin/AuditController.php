<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAudit;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only, and that is the whole design. There is no route that edits or
 * deletes an audit row, because a log anybody can tidy up is decoration.
 */
class AuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'action' => ['sometimes', 'nullable', 'string', 'max:40'],
            'subject_type' => ['sometimes', 'nullable', 'string', 'max:40'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $audits = AdminAudit::query()
            ->when($filters['action'] ?? null, fn ($q, $a) => $q->where('action', $a))
            ->when($filters['subject_type'] ?? null, fn ($q, $t) => $q->where('subject_type', $t))
            ->latest('created_at')
            ->paginate(50);

        return response()->json([
            'data' => collect($audits->items())->map(fn (AdminAudit $a) => [
                'id' => $a->id,
                'action' => $a->action,
                'subject_type' => $a->subject_type,
                'subject_id' => $a->subject_id,
                'changes' => $a->changes,
                'actor_id' => $a->actor_id,
                'actor_role' => $a->actor_role,
                'ip' => $a->ip,
                'user_agent' => $a->user_agent,
                'created_at' => $a->created_at,
            ]),
            'total' => $audits->total(),
            'page' => $audits->currentPage(),
            'last_page' => $audits->lastPage(),
        ]);
    }

    /** Is the chain whole? Shown at the top of the journal. */
    public function verify(): JsonResponse
    {
        return response()->json(Audit::verify() + ['total' => AdminAudit::count()]);
    }
}
