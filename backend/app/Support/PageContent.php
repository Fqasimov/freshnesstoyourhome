<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;

/**
 * The text of a page on the website, per language: its title and description
 * for Google, its H1, and a text under the products. Shared by category and
 * collection pages. Every field is optional — an empty one means the website
 * uses its template for it (web/src/data/productSchema.js).
 */
final class PageContent
{
    public const FIELDS = ['seo_title', 'seo_description', 'h1', 'intro', 'body'];

    /** Validation for translations.{locale}.{field}. */
    public static function rules(): array
    {
        return [
            'translations.*.seo_title' => ['sometimes', 'nullable', 'string', 'max:70'],
            'translations.*.seo_description' => ['sometimes', 'nullable', 'string', 'max:170'],
            'translations.*.h1' => ['sometimes', 'nullable', 'string', 'max:120'],
            // About 300–500 words is the aim; this leaves room for more.
            'translations.*.body' => ['sometimes', 'nullable', 'string', 'max:12000'],
            // A short lead above the products (100–200 words).
            'translations.*.intro' => ['sometimes', 'nullable', 'string', 'max:2000'],
            // Questions and answers under the text, also sent to Google as FAQPage.
            'translations.*.faq' => ['sometimes', 'nullable', 'array', 'max:10'],
            'translations.*.faq.*.q' => ['nullable', 'string', 'max:200'],
            'translations.*.faq.*.a' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /** Copy the fields that were sent onto a translation row; blank clears. */
    public static function fill(Model $row, array $fields): void
    {
        foreach (self::FIELDS as $f) {
            if (array_key_exists($f, $fields)) {
                $v = is_string($fields[$f]) ? trim($fields[$f]) : null;
                $row->{$f} = $v === '' ? null : $v;
            }
        }
        if (array_key_exists('faq', $fields)) {
            // Only whole pairs: a question with no answer is not one.
            $pairs = collect($fields['faq'] ?? [])
                ->map(fn ($x) => ['q' => trim((string) ($x['q'] ?? '')), 'a' => trim((string) ($x['a'] ?? ''))])
                ->filter(fn ($x) => $x['q'] !== '' && $x['a'] !== '')
                ->values()->all();
            $row->faq = $pairs ?: null;
        }
    }

    /** Every field in every language, for the panel and the catalogue. */
    public static function shape(Model $owner): array
    {
        $out = [];
        foreach (self::FIELDS as $f) {
            $out[$f] = $owner->translationMap($f);
        }
        $out['faq'] = $owner->translationMap('faq');

        return $out;
    }
}
