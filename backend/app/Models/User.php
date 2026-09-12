<?php

namespace App\Models;

use App\Support\BlindIndex;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    public const ROLE_CUSTOMER = 'customer';
    public const ROLE_COURIER = 'courier';
    public const ROLE_ADMIN = 'admin';

    /**
     * `role` is deliberately absent, and must stay absent.
     *
     * Every privilege-escalation bug of this shape is the same bug: a profile
     * update that accepts whatever the client sent. The column is assigned
     * only by `promote()` below, which no HTTP route reaches.
     *
     * `email_hash` and `phone_hash` are absent too — they are derived in
     * `booted()`, never supplied, so a caller cannot point their account at
     * somebody else's lookup hash.
     */
    protected $fillable = [
        'email',
        'name',
        'phone',
        'locale',
    ];

    protected $hidden = [
        'email_hash',
        'phone_hash',
        'remember_token',
    ];

    /**
     * Defaults the model knows about, not only the database.
     *
     * Without these, a freshly created instance has a null `role` in memory
     * until it is re-read — and the audit trail records who did what from that
     * in-memory value. Every customer action was being logged with no actor
     * role at all.
     */
    protected $attributes = [
        'role' => self::ROLE_CUSTOMER,
        'locale' => 'az',
    ];

    protected function casts(): array
    {
        return [
            // Laravel encrypts on write and decrypts on read, under APP_KEY
            // with the AES-256-GCM cipher configured in config/app.php.
            'email' => 'encrypted',
            'name' => 'encrypted',
            'phone' => 'encrypted',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'blocked_at' => 'datetime',
            'anonymised_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // Keep the blind indexes in step with the values they point at. Doing
        // this in the model rather than at call sites means there is no path
        // that writes an email without its lookup hash.
        static::saving(function (self $user): void {
            // An explicitly supplied hash wins. Only internal code can set one
            // — `email_hash` is not fillable — and anonymise() relies on this
            // to write its tombstone value while clearing the address itself.
            if ($user->isDirty('email') && ! $user->isDirty('email_hash')) {
                $user->email_hash = $user->email === null
                    ? null
                    : BlindIndex::ofEmail($user->email);
            }

            if ($user->isDirty('phone') && ! $user->isDirty('phone_hash')) {
                $user->phone_hash = $user->phone === null || $user->phone === ''
                    ? null
                    : BlindIndex::ofPhone($user->phone);
            }
        });
    }

    /** Find by email address without ever putting the address in a WHERE clause. */
    public static function findByEmail(string $email): ?self
    {
        return static::where('email_hash', BlindIndex::ofEmail($email))->first();
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isCourier(): bool
    {
        return $this->role === self::ROLE_COURIER;
    }

    public function isBlocked(): bool
    {
        return $this->blocked_at !== null;
    }

    /**
     * The only way a role changes.
     *
     * Not reachable from any HTTP route — it exists for the console command an
     * operator runs to appoint staff. Keep it that way.
     */
    public function promote(string $role): void
    {
        if (! in_array($role, [self::ROLE_CUSTOMER, self::ROLE_COURIER, self::ROLE_ADMIN], true)) {
            throw new \InvalidArgumentException("Unknown role [{$role}].");
        }

        $this->forceFill(['role' => $role])->save();
    }

    /**
     * Erase the person, keep the accounting.
     *
     * Apple requires in-app account deletion and a customer is entitled to
     * have their data removed, but the shop still has to be able to show what
     * it sold and to whom it owes what. So the personal data is destroyed —
     * not flagged, destroyed — while the order rows keep their totals, dates
     * and line items. What remains cannot be tied back to a person.
     */
    public function anonymise(): void
    {
        $this->tokens()->delete();
        $this->addresses()->delete();

        foreach ($this->orders()->cursor() as $order) {
            $order->forceFill([
                'contact_name' => null,
                'contact_phone' => null,
                'address_line' => null,
                'address_notes' => null,
                'customer_note' => null,
            ])->save();
        }

        $this->forceFill([
            // A random unique value: the unique index still has to hold, and
            // leaving the real hash would leave the account findable by email.
            'email_hash' => hash('sha256', 'deleted:'.$this->id.':'.bin2hex(random_bytes(16))),
            'email' => null,
            'name' => null,
            'phone' => null,
            'phone_hash' => null,
            'blocked_at' => now(),
            'anonymised_at' => now(),
        ])->save();
    }
}
