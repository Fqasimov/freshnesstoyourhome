<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * What a client is allowed to say when ordering.
 *
 * Note what is absent: no price, no subtotal, no total, no delivery fee. There
 * is nowhere in this shape to put a number the server would believe. Adding
 * one later — even "for convenience" — reopens the hole where a modified app
 * files a full basket for one qəpik.
 */
class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $lead = (int) config('freshness.order.lead_days');
        $maxAhead = (int) config('freshness.order.max_days_ahead');

        return [
            'address_id' => ['required', 'uuid'],

            'lines' => ['required', 'array', 'min:1', 'max:'.config('freshness.order.max_lines')],
            'lines.*.product_id' => ['required', 'string', 'max:60', Rule::exists('products', 'id')],
            'lines.*.qty' => [
                'required', 'numeric',
                // Three decimals is the finest weight the scales report; a
                // smaller number is either a mistake or an attempt to make the
                // rounding do something interesting.
                'min:0.001',
                'max:'.config('freshness.order.max_qty_per_line'),
            ],

            // The shop takes orders a day ahead, so today is not offered.
            'delivery_date' => [
                'required', 'date_format:Y-m-d',
                'after_or_equal:'.now()->addDays($lead)->toDateString(),
                'before_or_equal:'.now()->addDays($maxAhead)->toDateString(),
            ],
            'delivery_slot' => ['sometimes', 'nullable', 'string', 'max:20'],

            // Nothing is charged online. Both of these are settled at the door,
            // which is what keeps this system out of PCI scope entirely.
            'payment_method' => ['sometimes', Rule::in(['cash', 'pos'])],

            'note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $this->rejectDuplicateLines($v);
            $this->rejectFractionalPieces($v);
            $this->requireContactDetails($v);
        });
    }

    /**
     * One line per product.
     *
     * Two lines for the same product are not wrong so much as ambiguous — the
     * customer's basket screen shows one row, and reconciling a doubled line
     * at the door is somebody's afternoon.
     */
    private function rejectDuplicateLines(Validator $v): void
    {
        $ids = array_column((array) $this->input('lines', []), 'product_id');

        if (count($ids) !== count(array_unique($ids))) {
            $v->errors()->add('lines', 'Each product may appear only once; combine the quantities.');
        }
    }

    /**
     * You cannot buy 2.5 tins of caviar.
     *
     * Only goods sold by the kilo take a fractional quantity. Allowing it
     * everywhere lets a client order 0.001 of a fixed-price item and pay the
     * rounded-down price of nothing.
     */
    private function rejectFractionalPieces(Validator $v): void
    {
        $lines = (array) $this->input('lines', []);

        $kinds = Product::whereIn('id', array_column($lines, 'product_id'))
            ->pluck('unit_kind', 'id');

        foreach ($lines as $i => $line) {
            $kind = $kinds[$line['product_id'] ?? ''] ?? null;
            $qty = (float) ($line['qty'] ?? 0);

            if ($kind !== null && $kind !== Product::UNIT_KG && floor($qty) !== $qty) {
                $v->errors()->add("lines.{$i}.qty", 'This item is sold in whole units.');
            }
        }
    }

    /**
     * A courier cannot deliver to a customer with no name and no phone.
     *
     * Enforced on the server as well as in the app, because "the app makes you
     * fill it in" is not a control — the app is on the customer's phone.
     */
    private function requireContactDetails(Validator $v): void
    {
        $user = $this->user();

        if ($user === null || blank($user->name) || blank($user->phone)) {
            $v->errors()->add('profile', 'Add your name and phone number before ordering.');
        }
    }
}
