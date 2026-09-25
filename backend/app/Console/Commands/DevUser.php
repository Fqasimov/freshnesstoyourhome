<?php

namespace App\Console\Commands;

use App\Models\DeliveryZone;
use App\Models\User;
use App\Support\BlindIndex;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * A ready-to-use customer for local development.
 *
 * Sign-in is by emailed code, which is the right design and an obstacle when
 * there is no mailbox to read. This creates the account with its profile and
 * address already filled in, then issues a code and prints it — so the loop is
 * "run this, type the six digits into the app" rather than "configure a mail
 * provider before you can see a screen".
 *
 * It refuses to run outside local and testing environments. A command that
 * mints a working sign-in code is a back door anywhere else, and the guard is
 * the difference between a convenience and a vulnerability.
 */
class DevUser extends Command
{
    protected $signature = 'freshness:dev-user
        {--email=dev@freshnesstoyourhome.az : The address to sign in with}
        {--name=Rəşad Məmmədov : Name on the account}
        {--phone=+994501234567 : Phone the courier would call}
        {--role=customer : customer, courier or admin}
        {--token : Also print an API token, for curl and Postman}';

    protected $description = 'Create a development customer and print a sign-in code';

    public function handle(): int
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->error('freshness:dev-user only runs in local and testing environments.');
            $this->line('It mints a working sign-in code, which is a back door anywhere else.');

            return self::FAILURE;
        }

        $email = BlindIndex::normaliseEmail((string) $this->option('email'));
        $role = (string) $this->option('role');

        if (! in_array($role, [User::ROLE_CUSTOMER, User::ROLE_COURIER, User::ROLE_ADMIN], true)) {
            $this->error("Unknown role [{$role}].");

            return self::FAILURE;
        }

        $user = User::findByEmail($email) ?? new User;

        // forceFill because the profile is being set wholesale, including the
        // verification stamp that a real sign-in would have produced.
        $user->forceFill([
            'email' => $email,
            'name' => (string) $this->option('name'),
            'phone' => (string) $this->option('phone'),
            'locale' => 'az',
            'email_verified_at' => now(),
            'blocked_at' => null,
            'anonymised_at' => null,
        ])->save();

        if ($user->role !== $role) {
            $user->promote($role);
        }

        $this->seedAddress($user);

        $code = $this->issueCode($user, $email);

        $this->newLine();
        $this->info('Development account ready.');
        $this->newLine();
        $this->line('  email   '.$email);
        $this->line('  code    <options=bold>'.$code.'</>');
        $this->line('  role    '.$user->fresh()->role);
        if ($role === User::ROLE_ADMIN && ! \App\Support\AdminAccess::isNamed($email)) {
            $this->warn('  The panel will still refuse this address until it is in ADMIN_EMAILS in .env.');
        }
        $this->line('  name    '.$user->name);
        $this->line('  phone   '.$user->phone);
        $this->newLine();
        $this->comment('Type the email, then the code, into the app. The code lasts '
            .config('freshness.auth.code_ttl_minutes').' minutes — re-run this for a fresh one.');

        if ($this->option('token')) {
            $token = $user->createToken('dev-cli', ['*'], now()->addDays(30));
            $this->newLine();
            $this->line('  token   '.$token->plainTextToken);
            $this->newLine();
            $this->comment('  curl -H "Authorization: Bearer <token>" '
                .config('app.url').'/api/me');
        }

        $this->newLine();

        return self::SUCCESS;
    }

    /** Give the account somewhere to deliver to, so checkout works immediately. */
    private function seedAddress(User $user): void
    {
        if ($user->addresses()->exists()) {
            return;
        }

        $zone = DeliveryZone::where('is_active', true)->orderBy('sort')->first();

        if ($zone === null) {
            $this->warn('No delivery zones found — run `php artisan db:seed` first.');

            return;
        }

        $user->addresses()->create([
            'label' => 'Ev',
            'line' => 'Nizami küçəsi 28, mənzil 14',
            'notes' => '3-cü mərtəbə',
            'delivery_zone_id' => $zone->id,
            'is_default' => true,
        ]);
    }

    /**
     * Issue a code directly, bypassing the mailer and the hourly budgets.
     *
     * Deliberately not going through LoginCodeService: that would send mail
     * nobody can read here, and would spend a throttle budget that exists to
     * stop abuse rather than to stop development.
     */
    private function issueCode(User $user, string $email): string
    {
        $hash = BlindIndex::ofEmail($email);

        \App\Models\LoginCode::where('email_hash', $hash)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $length = (int) config('freshness.auth.code_length');
        $code = str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);

        \App\Models\LoginCode::create([
            'email_hash' => $hash,
            'email' => $email,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes((int) config('freshness.auth.code_ttl_minutes')),
            'request_ip' => '127.0.0.1',
        ]);

        return $code;
    }
}
