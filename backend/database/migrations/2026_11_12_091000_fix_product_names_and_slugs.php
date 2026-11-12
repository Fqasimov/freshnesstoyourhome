<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Names and addresses the SEO audit of 11 Nov 2026 flagged: typos, mixed
 * capitals, and caviar addresses that do not say what is on the page.
 *
 * Each change only applies while the value is still the one the audit saw, so
 * an edit made in the panel since then is left alone, and running this twice
 * changes nothing. An address that moves keeps working: its old form goes in
 * product_slug_redirects, which the website turns into a 301.
 *
 * Query builder only, no models: a migration must not depend on the host's
 * PHP cache having picked up today's model files.
 */
return new class extends Migration
{
    /** Azerbaijani name as the audit saw it => as it should read. */
    private const NAMES = [
        'Qara Beluga kürüsü 65 q' => 'Qara beluga kürüsü 65 q',
        'Burrata Truffle Pendiri' => 'Burrata Truffle pendiri',
        'Hinduşka Jambon' => 'Hinduşka jambonu',
        'Hinduşka Kolbasası' => 'Hinduşka kolbasası',
        'Dondurulmuş edemame' => 'Dondurulmuş edamame',
        'Dondurulmuş Qulancar' => 'Dondurulmuş qulancar',
        'Dondurulmuş Salmon Filesi' => 'Dondurulmuş salmon filesi',
        'Jasmin Düyü' => 'Jasmin düyüsü',
        'Qara Düyü' => 'Qara düyü',
        'Kərə yağı Yerli' => 'Yerli kərə yağı',
        'Duzlu Karamelli Merenga' => 'Duzlu karamelli merenqa',
        'Norveç Salmon Balığı (Qızıl Balıq)' => 'Norveç salmon balığı (qızıl balıq)',
        'Qara Nərə kürüsü 100 q' => 'Qara nərə kürüsü 100 q',
        'Qara Nərə kürüsü 65 q' => 'Qara nərə kürüsü 65 q',
        'Nərə Balığı Çin' => 'Nərə balığı (Çin)',
        'Atlantik Lobster' => 'Atlantik lobsteri',
    ];

    /** Old address => new one. Order matters where one frees the other's. */
    private const SLUGS = [
        'qirmizi-keta-kurusu' => 'qirmizi-keta-kurusu-500-q',
        'qirmizi-ikra' => 'qirmizi-keta-kurusu-200-q',
        'qara-beluga-kurusu' => 'qara-beluga-kurusu-100-q',
        'qara-beluqa-kurusu' => 'qara-beluga-kurusu-65-q',
        'qara-nere-kurusu' => 'qara-nere-kurusu-100-q',
        'quadratto-cioccolato' => 'quadrotto-cioccolato',
        'quadratto-meringata' => 'quadrotto-meringata',
        'quadratto-pistacchio' => 'quadrotto-pistacchio',
        'quadratto-mini-tiramisu' => 'quadrotto-mini-tiramisu',
        'buratta-truffle-pendiri' => 'burrata-truffle-pendiri',
        'worchestershire-sous' => 'worcestershire-sousu',
    ];

    public function up(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('product_slug_redirects')) {
            return;
        }

        foreach (self::NAMES as $from => $to) {
            DB::table('product_translations')->where('locale', 'az')->where('name', $from)
                ->update(['name' => $to, 'updated_at' => now()]);
        }

        // "Quadratto" is a misspelling of the brand's Quadrotto, in every language.
        foreach (DB::table('product_translations')->where('name', 'like', '%Quadratto%')->get() as $row) {
            DB::table('product_translations')->where('id', $row->id)
                ->update(['name' => str_replace('Quadratto', 'Quadrotto', $row->name), 'updated_at' => now()]);
        }

        foreach (self::SLUGS as $from => $to) {
            $product = DB::table('products')->where('slug', $from)->first();
            if ($product === null || DB::table('products')->where('slug', $to)->exists()) {
                continue;
            }
            DB::table('product_slug_redirects')->where('old_slug', $to)->delete();
            DB::table('product_slug_redirects')->updateOrInsert(
                ['old_slug' => $from],
                ['product_id' => $product->id, 'created_at' => now(), 'updated_at' => now()],
            );
            DB::table('products')->where('id', $product->id)->update(['slug' => $to, 'updated_at' => now()]);
        }

        \App\Support\CatalogueCache::flush();
    }

    public function down(): void
    {
        // Data, not schema: nothing to undo safely.
    }
};
