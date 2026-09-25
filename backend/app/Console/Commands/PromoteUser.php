<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Console\Command;

/**
 * Appoint couriers.
 *
 * Not admins: those are named in ADMIN_EMAILS in the server's .env, and the
 * role follows the address the first time it signs in to the panel. An admin
 * role handed out here would open nothing, so this refuses rather than
 * leaving somebody puzzling over why the panel still says no.
 *
 * The only way a role changes, and deliberately a console command rather than
 * a button: it requires access to the server, so an admin session that leaks
 * cannot mint a second admin that outlives revoking the first. The admin panel
 * has no route that reaches this, and adding one would undo the reason it is
 * here.
 */
class PromoteUser extends Command
{
    protected $signature = 'freshness:promote
                            {email : The address of an existing account}
                            {role=courier : customer or courier (admins are set by ADMIN_EMAILS)}';

    protected $description = 'Give an existing account the courier role, or take it back';

    public function handle(): int
    {
        $role = $this->argument('role');

        if ($role === User::ROLE_ADMIN) {
            $this->error('Admins are not appointed here. Add the address to ADMIN_EMAILS in the server\'s .env, then sign in at /cms.');

            return self::FAILURE;
        }

        if (! in_array($role, [User::ROLE_CUSTOMER, User::ROLE_COURIER, User::ROLE_ADMIN], true)) {
            $this->error("Unknown role [{$role}]. Use customer, courier or admin.");

            return self::FAILURE;
        }

        // Found through the blind index, so the address is never in a WHERE
        // clause — the same path the sign-in flow uses.
        $user = User::findByEmail($this->argument('email'));

        if ($user === null) {
            $this->error('No account with that address. They have to sign in once first.');

            return self::FAILURE;
        }

        $was = $user->role;

        if ($was === $role) {
            $this->info("Already {$role}. Nothing to do.");

            return self::SUCCESS;
        }

        if (! $this->confirm("Change {$this->argument('email')} from {$was} to {$role}?", true)) {
            return self::FAILURE;
        }

        $user->promote($role);

        // Recorded with no actor: this happened at a terminal, not in the
        // panel. The row still says what changed and when, which is the part
        // that matters when somebody asks later.
        Audit::record(null, 'user.promote', 'user', $user->id, [
            'role' => ['from' => $was, 'to' => $role],
        ]);

        // Every token they were holding was issued to the role they had
        // before. Making them start again is one sign-in, and it removes the
        // question of what a half-promoted session can do.
        $user->tokens()->delete();

        $this->info("Done. {$was} → {$role}. They will need to sign in again.");

        return self::SUCCESS;
    }
}
