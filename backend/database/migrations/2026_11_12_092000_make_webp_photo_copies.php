<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * WebP copies (300, 600 and 1200 px wide) of every photograph uploaded before
 * uploads started making them, for the website's srcset. Same files and names
 * as App\Support\StoredImage::makeVariants, written out here so the migration
 * does not depend on the host's PHP cache having the new class.
 *
 * Best effort and never fatal: a photo that cannot be read is skipped, and a
 * host without WebP support skips the lot — the website then keeps the JPEGs.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! function_exists('imagewebp')) {
            return;
        }
        @set_time_limit(300);

        $files = DB::table('products')->whereNotNull('image_file')->pluck('image_file')
            ->merge(DB::getSchemaBuilder()->hasTable('product_images') ? DB::table('product_images')->pluck('file') : [])
            ->filter(fn ($f) => is_string($f) && preg_match('#^(products|bundles)/[A-Za-z0-9-]+\.jpg$#', $f));

        $disk = Storage::disk('public');
        foreach ($files as $full) {
            try {
                $todo = array_filter([300, 600, 1200], fn ($w) => ! $disk->exists(self::path($full, $w)));
                if ($todo === [] || ! $disk->exists($full)) {
                    continue;
                }
                $image = @imagecreatefromstring((string) $disk->get($full));
                if ($image === false) {
                    continue;
                }
                $edge = max(imagesx($image), imagesy($image));
                foreach ($todo as $w) {
                    if ($w > $edge && $w !== 300) {
                        continue;
                    }
                    $scale = min(1, $w / $edge);
                    $tw = max(1, (int) round(imagesx($image) * $scale));
                    $th = max(1, (int) round(imagesy($image) * $scale));
                    $canvas = imagecreatetruecolor($tw, $th);
                    imagefilledrectangle($canvas, 0, 0, $tw, $th, imagecolorallocate($canvas, 255, 255, 255));
                    imagecopyresampled($canvas, $image, 0, 0, 0, 0, $tw, $th, imagesx($image), imagesy($image));
                    ob_start();
                    imagewebp($canvas, null, 78);
                    $disk->put(self::path($full, $w), (string) ob_get_clean());
                    imagedestroy($canvas);
                }
                imagedestroy($image);
            } catch (\Throwable) {
                // One bad photo is not a failed deploy.
            }
        }

        \App\Support\CatalogueCache::flush();
    }

    private static function path(string $full, int $w): string
    {
        return preg_replace('/\.jpg$/', "_w{$w}.webp", $full) ?? $full;
    }

    public function down(): void
    {
    }
};
