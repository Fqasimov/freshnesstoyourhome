<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * One name for the catalogue cache key.
 *
 * The catalogue is cached for ten minutes, which is right for traffic and
 * wrong for a shopkeeper who has just changed a price and reloaded the shop to
 * check. Every admin write that touches what customers see calls flush(), so
 * the edit is visible on the next request rather than the next decade minute.
 */
final class CatalogueCache
{
    public const KEY = 'catalogue:v1';

    public static function flush(): void
    {
        Cache::forget(self::KEY);
    }
}
