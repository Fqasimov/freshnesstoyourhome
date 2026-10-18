<?php

namespace App\Support;

use App\Models\Product;
use Illuminate\Support\Str;

/**
 * A product's address on the website: /mehsul/{slug}.
 *
 * Made from the Azerbaijani name, because that is what people in Baku type
 * into Google — "qirmizi-ikra", not "red-caviar". Written once, when the
 * product first has a name, and never rewritten when the name changes: an
 * address Google has already indexed must keep working. The shopkeeper can
 * still set one by hand in the panel.
 *
 * web/scripts/prerender.mjs carries the same rules for the website's offline
 * copy of the catalogue; keep the two in step.
 */
final class Slug
{
    public const PATTERN = '/^[a-z0-9]+(-[a-z0-9]+)*$/';

    public const MAX = 80;

    /** Letters Str::ascii does not reliably turn into what a person would type. */
    private const AZ = [
        'ə' => 'e', 'ı' => 'i', 'i̇' => 'i', 'ö' => 'o', 'ü' => 'u',
        'ğ' => 'g', 'ş' => 's', 'ç' => 'c',
    ];

    public static function of(string $text): string
    {
        $s = strtr(mb_strtolower($text, 'UTF-8'), self::AZ);
        $s = Str::ascii($s);
        $s = trim(preg_replace('/[^a-z0-9]+/', '-', $s), '-');

        if (strlen($s) > self::MAX) {
            $s = substr($s, 0, self::MAX);
            // Cut at a word, not through one.
            $s = str_contains($s, '-') ? substr($s, 0, strrpos($s, '-')) : $s;
        }

        return $s;
    }

    /**
     * A slug for this product that no other product has.
     *
     * Two products with the same name (a cheese in two sizes) are told apart
     * by their unit label first — "burrata-pendiri-200-gr" reads better than
     * "burrata-pendiri-2" — and by a number only after that.
     */
    public static function uniqueFor(Product $product): string
    {
        $base = self::of((string) $product->nameIn('az')) ?: $product->id;
        $taken = fn (string $s) => Product::where('slug', $s)->whereKeyNot($product->id)->exists();

        if (! $taken($base)) {
            return $base;
        }

        $unit = self::of((string) ($product->translationMap('unit_label')['az'] ?? ''));
        if ($unit !== '' && ! $taken("{$base}-{$unit}")) {
            return "{$base}-{$unit}";
        }

        for ($n = 2; ; $n++) {
            if (! $taken("{$base}-{$n}")) {
                return "{$base}-{$n}";
            }
        }
    }
}
