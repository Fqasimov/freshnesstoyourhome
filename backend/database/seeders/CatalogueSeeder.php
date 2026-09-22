<?php

namespace Database\Seeders;

use App\Models\Bundle;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * The catalogue, from shared/catalogue.json.
 *
 * That file is the one written copy: it seeds this database, it is the
 * website's bundled fallback and it is the app's offline copy, so a listing
 * written once reaches all three. A price change there is a one-line diff a
 * non-programmer can read.
 *
 * It is not authoritative once seeded. The database is — the admin panel edits
 * rows, and /api/catalogue serves rows.
 *
 * Idempotent. Running it again updates prices and translations in place and
 * leaves order history untouched, so it is safe to re-run after editing the
 * JSON.
 */
class CatalogueSeeder extends Seeder
{
    public function run(): void
    {
        $path = base_path('../shared/catalogue.json');

        if (! is_file($path)) {
            throw new RuntimeException("Catalogue data missing at {$path}. Run `npm run sync` at the repository root.");
        }

        $data = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        DB::transaction(function () use ($data): void {
            $this->seedCategories($data['categories'] ?? []);
            $this->seedProducts($data['products'] ?? []);
            $this->seedBundles($data['bundles'] ?? []);
        });

        $this->command?->info(sprintf(
            'Catalogue: %d categories, %d products, %d bundles (bundles left inactive).',
            count($data['categories'] ?? []),
            count($data['products'] ?? []),
            count($data['bundles'] ?? []),
        ));
    }

    private function seedCategories(array $categories): void
    {
        foreach ($categories as $row) {
            $category = Category::updateOrCreate(
                ['id' => $row['id']],
                ['sort' => $row['sort'], 'is_active' => true],
            );

            foreach ($row['names'] as $locale => $name) {
                $category->translations()->updateOrCreate(
                    ['locale' => $locale],
                    ['name' => $name],
                );
            }
        }
    }

    private function seedProducts(array $products): void
    {
        foreach ($products as $row) {
            $product = Product::updateOrCreate(
                ['id' => $row['id']],
                [
                    'category_id' => $row['category_id'],
                    'price_minor' => $row['price_minor'],
                    'currency' => config('freshness.currency'),
                    'unit_kind' => $row['unit_kind'],
                    'unit_qty' => $row['unit_qty'],
                    'is_popular' => $row['is_popular'],
                    'is_active' => true,
                    // The photos ship inside the apps, keyed by product id, so
                    // the image a customer sees cannot drift from the row.
                    'image_path' => $row['id'].'.jpg',
                    'sort' => $row['sort'],
                ],
            );

            foreach ($row['translations'] as $locale => $t) {
                $product->translations()->updateOrCreate(
                    ['locale' => $locale],
                    [
                        'name' => $t['name'],
                        'description' => $t['description'] ?? null,
                        'unit_label' => $t['unit_label'] ?? null,
                    ],
                );
            }
        }
    }

    /**
     * Bundles are seeded INACTIVE, on purpose.
     *
     * Their contents and their discounts were invented while designing the
     * website and have never been confirmed by the business. On a web page
     * that is a placeholder; in an app it is a price someone is charged. They
     * stay switched off until somebody with the authority to discount says so.
     */
    private function seedBundles(array $bundles): void
    {
        foreach ($bundles as $row) {
            $bundle = Bundle::updateOrCreate(
                ['id' => $row['id']],
                [
                    'discount_percent' => $row['discount_percent'],
                    'is_active' => false,
                    'sort' => $row['sort'],
                ],
            );

            foreach ($row['translations'] as $locale => $t) {
                $bundle->translations()->updateOrCreate(
                    ['locale' => $locale],
                    ['name' => $t['name'], 'description' => $t['description'] ?? null],
                );
            }

            $bundle->items()->delete();
            foreach ($row['items'] as $item) {
                $bundle->items()->create([
                    'product_id' => $item['product_id'],
                    'qty' => $item['qty'],
                ]);
            }
        }
    }
}
