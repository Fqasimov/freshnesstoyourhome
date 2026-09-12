<?php

namespace App\Http\Resources;

use App\Models\OrderItem;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = $request->user()?->locale ?? 'az';

        return [
            'id' => $this->id,
            'code' => $this->code,
            'status' => $this->status,
            'currency' => $this->currency,

            'subtotal_minor' => $this->subtotal_minor,
            'delivery_fee_minor' => $this->delivery_fee_minor,
            'discount_minor' => $this->discount_minor,
            'total_minor' => $this->total_minor,

            // Null until the courier has weighed the goods. The app shows the
            // estimate as "about", and only shows a firm figure once this
            // arrives — so a customer is never quoted a precision we do not
            // have.
            'requires_weighing' => $this->requires_weighing,
            'final_total_minor' => $this->final_total_minor,
            'weighed_at' => $this->weighed_at,

            'payable_minor' => $this->payableMinor(),
            'payable_display' => Money::format($this->payableMinor(), $this->currency),

            'delivery_date' => $this->delivery_date?->toDateString(),
            'delivery_slot' => $this->delivery_slot,
            'payment_method' => $this->payment_method,

            'address_line' => $this->address_line,
            'address_notes' => $this->address_notes,
            'contact_name' => $this->contact_name,
            'contact_phone' => $this->contact_phone,
            'note' => $this->customer_note,

            'can_cancel' => $this->isCancellableByCustomer(),

            'placed_at' => $this->placed_at,
            'delivered_at' => $this->delivered_at,
            'cancelled_at' => $this->cancelled_at,
            'cancel_reason' => $this->cancel_reason,

            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn (OrderItem $i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'name' => $i->name_snapshot[$locale] ?? $i->name_snapshot['az'] ?? '',
                'unit_kind' => $i->unit_kind,
                'unit_price_minor' => $i->unit_price_minor,
                'qty' => $i->qty,
                'is_weight_based' => $i->is_weight_based,
                'confirmed_qty' => $i->confirmed_qty,
                'line_total_minor' => $i->line_total_minor,
                'final_line_total_minor' => $i->final_line_total_minor,
            ])),
        ];
    }
}
