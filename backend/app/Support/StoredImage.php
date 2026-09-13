<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Turning a file somebody uploaded into a photograph we are willing to serve.
 *
 * The file is never stored as it arrived. It is decoded into a bitmap and
 * written out again as a fresh JPEG, which is the whole security argument:
 * whatever else was in the original — a PHP payload after the image data, a
 * polyglot that is both a valid GIF and a valid script, an XSS vector inside
 * an SVG — does not survive being turned into pixels and back. The stored file
 * is bytes this process wrote, not bytes a stranger sent.
 *
 * Two other things fall out of that, both of which matter:
 *
 *  - EXIF is dropped, and EXIF on a phone photograph carries GPS coordinates.
 *    A shop that publishes the exact spot each product was photographed is
 *    publishing its supplier list and its home address.
 *  - The filename is ours. The uploaded name is never used for anything, so
 *    "../../.env" and "x.php.jpg" are not interesting.
 *
 * SVG is refused outright. It is a document format that can carry script, and
 * there is no version of "sanitised SVG" worth defending on a shop's own
 * domain, where a stored XSS reaches the admin session.
 *
 * Products and bundles both go through here. The directory is a parameter, but
 * only from a fixed list — a caller that could name the directory could write
 * anywhere the disk reaches.
 */
final class StoredImage
{
    /** The only places a photograph may be written or deleted. */
    public const DIRS = ['products', 'bundles'];

    /** Big enough for a retina product card, small enough to send over 4G. */
    private const MAX_EDGE = 1400;
    private const THUMB_EDGE = 360;
    private const QUALITY = 82;
    private const THUMB_QUALITY = 76;

    /** What GD can decode and we are willing to accept. */
    private const ACCEPTED = [
        IMAGETYPE_JPEG => 'jpeg',
        IMAGETYPE_PNG => 'png',
        IMAGETYPE_WEBP => 'webp',
    ];

    /**
     * Store an upload and return the path to the full-size file.
     *
     * @throws RuntimeException when the bytes are not an image we can decode
     */
    public static function store(UploadedFile $file, string $dir): string
    {
        if (! in_array($dir, self::DIRS, true)) {
            throw new RuntimeException("Unknown image directory [{$dir}].");
        }

        $path = $file->getRealPath();

        // Read the actual bytes rather than the name or the Content-Type
        // header, both of which the client chose.
        $info = @getimagesize($path);
        if ($info === false || ! isset(self::ACCEPTED[$info[2]])) {
            throw new RuntimeException('That file is not a JPEG, PNG or WebP image.');
        }

        [$width, $height] = $info;

        // A "decompression bomb": a few kilobytes of file that expands to a
        // hundred megapixels in memory. Checked before decoding, because after
        // decoding is too late.
        if ($width * $height > 50_000_000) {
            throw new RuntimeException('That image is too large to process.');
        }

        $source = match ($info[2]) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($path),
            IMAGETYPE_PNG => @imagecreatefrompng($path),
            IMAGETYPE_WEBP => @imagecreatefromwebp($path),
        };

        if ($source === false) {
            throw new RuntimeException('That image could not be read.');
        }

        try {
            // A phone photograph is often stored sideways with an EXIF tag
            // saying which way up it is. Re-encoding drops the tag, so the
            // rotation has to be applied to the pixels first or every portrait
            // photo lands on its side.
            $source = self::applyExifRotation($source, $path, $info[2]);

            $name = (string) Str::uuid();
            $full = $dir.'/'.$name.'.jpg';
            $thumb = self::thumbPath($full);

            Storage::disk('public')->put($full, self::encode($source, self::MAX_EDGE, self::QUALITY));
            Storage::disk('public')->put($thumb, self::encode($source, self::THUMB_EDGE, self::THUMB_QUALITY));

            return $full;
        } finally {
            imagedestroy($source);
        }
    }

    /** Remove a stored photograph and its thumbnail. */
    public static function forget(?string $path): void
    {
        if (blank($path)) {
            return;
        }

        // Only ever inside our own directories: a stored value is written by
        // store() above, but a delete that trusts a path is one bad migration
        // away from removing something else.
        $inside = array_filter(self::DIRS, fn (string $d) => str_starts_with($path, $d.'/'));
        if ($inside === []) {
            return;
        }

        Storage::disk('public')->delete([$path, self::thumbPath($path)]);
    }

    public static function thumbPath(string $path): string
    {
        return preg_replace('/\.jpg$/', '_t.jpg', $path) ?? $path;
    }

    /** @param \GdImage $image */
    private static function encode($image, int $maxEdge, int $quality): string
    {
        $w = imagesx($image);
        $h = imagesy($image);
        $scale = min(1, $maxEdge / max($w, $h));

        $tw = max(1, (int) round($w * $scale));
        $th = max(1, (int) round($h * $scale));

        $canvas = imagecreatetruecolor($tw, $th);

        // JPEG has no transparency, so a PNG's transparent pixels would come
        // out black. White is what a product cut out on a white background
        // expects to sit on.
        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefilledrectangle($canvas, 0, 0, $tw, $th, $white);
        imagecopyresampled($canvas, $image, 0, 0, 0, 0, $tw, $th, $w, $h);

        ob_start();
        imagejpeg($canvas, null, $quality);
        $bytes = (string) ob_get_clean();

        imagedestroy($canvas);

        return $bytes;
    }

    /**
     * @param  \GdImage  $image
     * @return \GdImage
     */
    private static function applyExifRotation($image, string $path, int $type)
    {
        if ($type !== IMAGETYPE_JPEG || ! function_exists('exif_read_data')) {
            return $image;
        }

        $exif = @exif_read_data($path);
        $orientation = (int) ($exif['Orientation'] ?? 1);

        $angle = match ($orientation) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };

        if ($angle === 0) {
            return $image;
        }

        $rotated = imagerotate($image, $angle, 0);
        if ($rotated === false) {
            return $image;
        }

        imagedestroy($image);

        return $rotated;
    }
}
