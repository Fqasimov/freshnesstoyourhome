<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * The one server-side step of a deploy, for hosting with no shell.
 *
 * .github/workflows/deploy.yml uploads the new code over FTP, then calls this
 * to run the migrations that came with it — what `php artisan migrate` would
 * be on a server with a terminal. Nothing else is reachable from here.
 *
 * Off unless DEPLOY_TOKEN is set in .env to something long, and then only for
 * a caller presenting that same token. Anyone else gets a 404, the same as
 * for a route that does not exist. Migrations are idempotent: a stranger who
 * somehow had the token could only run what the code already contains.
 */
class DeployController extends Controller
{
    public function migrate(Request $request): JsonResponse
    {
        $this->authorise($request);

        $code = Artisan::call('migrate', ['--force' => true]);

        return response()->json([
            'ok' => $code === 0,
            'output' => trim(Artisan::output()),
        ], $code === 0 ? 200 : 500);
    }

    /**
     * Re-encrypt the data under the current APP_KEY, for a host with no shell.
     *
     * Changing the encryption key is two steps (see ReencryptData). The second
     * has to run somewhere, and on this host that is here, behind the same
     * token as the migrations and for the same reason. It writes nothing but
     * the same data under new ciphertext.
     */
    public function reencrypt(Request $request): JsonResponse
    {
        $this->authorise($request);

        $code = Artisan::call('freshness:reencrypt');

        return response()->json([
            'ok' => $code === 0,
            'output' => trim(Artisan::output()),
        ], $code === 0 ? 200 : 500);
    }

    private function authorise(Request $request): void
    {
        $token = (string) config('freshness.deploy_token');
        $given = (string) $request->header('X-Deploy-Token');

        if (strlen($token) < 32 || ! hash_equals($token, $given)) {
            abort(404);
        }
    }
}
