<?php

namespace App\Support;

use App\Models\Order;

/**
 * What an order notification says, in the customer's language.
 *
 * Two rules hold everywhere in this file.
 *
 * A notification body appears on a locked screen, which is the least private
 * place a message can land. So it carries the order code and the status and
 * nothing else — never the address, never the contact name, never what was
 * bought. Anyone glancing at the phone learns that a shop is delivering, and
 * not to whom or where.
 *
 * And nothing is sent for 'placed'. The customer is looking at the confirmation
 * screen at that moment; buzzing their pocket to tell them what they just did
 * is how an app teaches people to turn its notifications off.
 */
final class OrderPushMessage
{
    /**
     * @return array{title: string, body: string}|null  null when nothing should be sent
     */
    public static function forStatus(Order $order, string $status, string $locale): ?array
    {
        $strings = self::strings($locale);

        $body = match ($status) {
            Order::CONFIRMED => $strings['confirmed'],
            Order::PREPARING => $strings['preparing'],
            Order::OUT_FOR_DELIVERY => $strings['out_for_delivery'],
            Order::DELIVERED => $strings['delivered'],
            Order::CANCELLED => $strings['cancelled'],
            default => null,
        };

        if ($body === null) {
            return null;
        }

        return [
            'title' => str_replace(':code', $order->code, $strings['title']),
            'body' => $body,
        ];
    }

    /**
     * The weighing message.
     *
     * This is the notification that earns the feature. The customer agreed to
     * an estimate; this is the real figure, and they want it before somebody
     * knocks on the door expecting payment. The amount is not private in the
     * way an address is — it is what they are about to hand over — and without
     * it the notification would be pointless.
     */
    public static function forWeighed(Order $order, string $locale): array
    {
        $strings = self::strings($locale);
        $amount = Money::format($order->payableMinor(), $order->currency);

        return [
            'title' => str_replace(':code', $order->code, $strings['title']),
            'body' => str_replace(':amount', $amount, $strings['weighed']),
        ];
    }

    private static function strings(string $locale): array
    {
        return match ($locale) {
            'ru' => [
                'title' => 'Заказ :code',
                'confirmed' => 'Заказ подтверждён.',
                'preparing' => 'Мы готовим ваш заказ.',
                'out_for_delivery' => 'Курьер выехал к вам.',
                'delivered' => 'Заказ доставлен. Спасибо!',
                'cancelled' => 'Заказ отменён.',
                'weighed' => 'Товар взвешен — итоговая сумма :amount.',
            ],
            'en' => [
                'title' => 'Order :code',
                'confirmed' => 'Your order is confirmed.',
                'preparing' => 'We are preparing your order.',
                'out_for_delivery' => 'Your courier is on the way.',
                'delivered' => 'Delivered. Thank you!',
                'cancelled' => 'Your order has been cancelled.',
                'weighed' => 'Weighed — the final amount is :amount.',
            ],
            default => [
                'title' => ':code sifarişi',
                'confirmed' => 'Sifarişiniz təsdiqləndi.',
                'preparing' => 'Sifarişiniz hazırlanır.',
                'out_for_delivery' => 'Kuryer yola çıxdı.',
                'delivered' => 'Sifarişiniz çatdırıldı. Təşəkkür edirik!',
                'cancelled' => 'Sifarişiniz ləğv edildi.',
                'weighed' => 'Çəki dəqiqləşdirildi — yekun məbləğ :amount.',
            ],
        };
    }
}
