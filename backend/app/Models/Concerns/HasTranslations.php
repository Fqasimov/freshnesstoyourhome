<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Collection;

/**
 * Shared lookup for the *_translations tables.
 *
 * Azerbaijani is the source of truth; Russian and English are translations of
 * it. When a locale is missing a row the fallback is AZ, never an empty
 * string — a customer seeing a blank product name is worse than seeing it in
 * the wrong language.
 */
trait HasTranslations
{
    public function translation(?string $locale = null): ?object
    {
        $locale = $locale ?: app()->getLocale();

        /** @var Collection $all */
        $all = $this->translations;

        return $all->firstWhere('locale', $locale)
            ?? $all->firstWhere('locale', 'az')
            ?? $all->first();
    }

    public function nameIn(?string $locale = null): string
    {
        return $this->translation($locale)?->name ?? $this->getKey();
    }

    /** All locales at once — what the catalogue endpoint hands to the clients. */
    public function translationMap(string $field = 'name'): array
    {
        return $this->translations
            ->mapWithKeys(fn ($t) => [$t->locale => $t->{$field}])
            ->filter(fn ($v) => $v !== null && $v !== '')
            ->all();
    }
}
