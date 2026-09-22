<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasUuids;

    public const PLACED = 'placed';
    public const CONFIRMED = 'confirmed';
    public const PREPARING = 'preparing';
    public const OUT_FOR_DELIVERY = 'out_for_delivery';
    public const DELIVERED = 'delivered';
    public const CANCELLED = 'cancelled';

    /**
     * The only transitions that exist.
     *
     * Anything not listed here is rejected by OrderService::transition(), so a
     * delivered order cannot go back to preparing and a cancelled one cannot
     * be resurrected. Keeping it as data rather than as a pile of ifs means
     * the rules can be read in one place and tested directly.
     */
    public const TRANSITIONS = [
        self::PLACED => [self::CONFIRMED, self::CANCELLED],
        self::CONFIRMED => [self::PREPARING, self::CANCELLED],
        self::PREPARING => [self::OUT_FOR_DELIVERY, self::CANCELLED],
        self::OUT_FOR_DELIVERY => [self::DELIVERED, self::CANCELLED],
        self::DELIVERED => [],
        self::CANCELLED => [],
    ];

    /** Empty on purpose: nothing on an order is ever mass-assigned. */
    protected $fillable = [];

    protected $hidden = [];

    protected function casts(): array
    {
        return [
            'contact_name' => 'encrypted',
            'contact_phone' => 'encrypted',
            'address_line' => 'encrypted',
            'address_notes' => 'encrypted',
            'address_map_link' => 'encrypted',
            'customer_note' => 'encrypted',
            'requires_weighing' => 'boolean',
            'subtotal_minor' => 'integer',
            'delivery_fee_minor' => 'integer',
            'discount_minor' => 'integer',
            'total_minor' => 'integer',
            'final_subtotal_minor' => 'integer',
            'final_total_minor' => 'integer',
            'delivery_date' => 'date',
            'placed_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'delivered_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'weighed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class, 'delivery_zone_id');
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    /**
     * A customer may call off an order until it has left the building.
     *
     * Once it is out for delivery the goods have been cut, weighed and loaded,
     * so cancelling is a phone call to the shop rather than a button.
     */
    public function isCancellableByCustomer(): bool
    {
        return in_array($this->status, [self::PLACED, self::CONFIRMED], true);
    }

    /** What the customer actually pays: the confirmed total once weighed, else the estimate. */
    public function payableMinor(): int
    {
        return $this->final_total_minor ?? $this->total_minor;
    }
}
