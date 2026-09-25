<?php

namespace Tests\Feature;

use App\Models\Bundle;
use App\Models\Product;
use App\Models\User;
use App\Support\StoredImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * A photograph of a set.
 *
 * Sets have always been drawn as a strip of their four products' pictures,
 * which is honest and also four photographs taken on four different days. One
 * picture of the actual box sells it better — so this is an override, and
 * removing it puts the strip back rather than leaving a hole.
 */
class BundlePhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
        Storage::fake('public');
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->promote(User::ROLE_ADMIN);

        return $user->fresh();
    }

    private function bundle(): Bundle
    {
        return Bundle::first();
    }

    public function test_a_set_can_be_photographed(): void
    {
        $bundle = $this->bundle();
        $this->signInAs($this->admin());

        $body = $this->post("/api/admin/bundles/{$bundle->id}/photo", [
            'photo' => UploadedFile::fake()->image('box.jpg', 1600, 1200),
        ])->assertOk()->json();

        $this->assertTrue($body['has_upload']);
        $this->assertNotNull($body['image_url']);

        $stored = $bundle->fresh()->image_file;
        // Its own directory, so a bundle photo and a product photo can never
        // collide or be mistaken for one another.
        $this->assertStringStartsWith('bundles/', $stored);
        Storage::disk('public')->assertExists($stored);
        Storage::disk('public')->assertExists(StoredImage::thumbPath($stored));
    }

    public function test_the_photograph_reaches_the_website(): void
    {
        $bundle = $this->bundle();
        $bundle->forceFill(['is_active' => true])->save();

        $this->getJson('/api/catalogue')->assertOk();   // warm the cache

        $this->signInAs($this->admin());
        $this->post("/api/admin/bundles/{$bundle->id}/photo", [
            'photo' => UploadedFile::fake()->image('box.jpg', 1200, 900),
        ])->assertOk();

        $row = collect($this->getJson('/api/catalogue')->json('bundles'))
            ->firstWhere('id', $bundle->id);

        $this->assertNotNull($row['image_url']);
        // The contents still travel, because the strip is the fallback and the
        // list of what is in the box is worth showing either way.
        $this->assertNotEmpty($row['items']);
    }

    public function test_removing_it_puts_the_strip_back(): void
    {
        $bundle = $this->bundle();
        $this->signInAs($this->admin());

        $this->post("/api/admin/bundles/{$bundle->id}/photo", [
            'photo' => UploadedFile::fake()->image('box.jpg', 900, 900),
        ])->assertOk();
        $stored = $bundle->fresh()->image_file;

        $body = $this->deleteJson("/api/admin/bundles/{$bundle->id}/photo")->assertOk()->json();

        $this->assertFalse($body['has_upload']);
        $this->assertNull($body['image_url']);
        $this->assertNotEmpty($body['items']);
        Storage::disk('public')->assertMissing($stored);
    }

    public function test_replacing_it_removes_the_old_files(): void
    {
        $bundle = $this->bundle();
        $this->signInAs($this->admin());

        $this->post("/api/admin/bundles/{$bundle->id}/photo", [
            'photo' => UploadedFile::fake()->image('a.jpg', 900, 900),
        ])->assertOk();
        $first = $bundle->fresh()->image_file;

        $this->post("/api/admin/bundles/{$bundle->id}/photo", [
            'photo' => UploadedFile::fake()->image('b.jpg', 900, 900),
        ])->assertOk();

        $this->assertNotSame($first, $bundle->fresh()->image_file);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertMissing(StoredImage::thumbPath($first));
    }

    public function test_a_file_that_is_not_an_image_is_refused(): void
    {
        $bundle = $this->bundle();
        $this->signInAs($this->admin());

        $this->post("/api/admin/bundles/{$bundle->id}/photo", [
            'photo' => UploadedFile::fake()->create('notes.txt', 4, 'image/jpeg'),
        ])->assertStatus(422);

        $this->assertNull($bundle->fresh()->image_file);
    }

    /** The same re-encoding, so the same guarantee. */
    public function test_anything_hidden_after_the_image_data_does_not_survive(): void
    {
        $bundle = $this->bundle();
        $this->signInAs($this->admin());

        $payload = '<?php system($_GET["c"]); ?>';
        $path = tempnam(sys_get_temp_dir(), 'poly').'.jpg';
        file_put_contents($path, UploadedFile::fake()->image('ok.jpg', 700, 500)->get().$payload);

        $this->post("/api/admin/bundles/{$bundle->id}/photo", [
            'photo' => new UploadedFile($path, 'ok.jpg', 'image/jpeg', null, true),
        ])->assertOk();

        $bytes = Storage::disk('public')->get($bundle->fresh()->image_file);
        $this->assertStringNotContainsString($payload, $bytes);
        $this->assertSame("\xFF\xD8\xFF", substr($bytes, 0, 3));
    }

    public function test_only_an_admin_can_upload_one(): void
    {
        $bundle = $this->bundle();
        $courier = User::factory()->create();
        $courier->promote(User::ROLE_COURIER);

        foreach ([User::factory()->create(), $courier->fresh()] as $user) {
            $this->signInAs($user);
            $this->post("/api/admin/bundles/{$bundle->id}/photo", [
                'photo' => UploadedFile::fake()->image('x.jpg', 800, 800),
            ])->assertNotFound();
        }

        $this->assertNull($bundle->fresh()->image_file);
    }

    public function test_it_is_recorded(): void
    {
        $bundle = $this->bundle();
        $this->signInAs($this->admin());

        $this->post("/api/admin/bundles/{$bundle->id}/photo", [
            'photo' => UploadedFile::fake()->image('x.jpg', 800, 800),
        ])->assertOk();

        $this->assertDatabaseHas('admin_audits', [
            'action' => 'bundle.photo',
            'subject_id' => $bundle->id,
        ]);
    }

    /** A photograph does not make a set sellable on its own. */
    public function test_a_photographed_set_still_needs_its_products_in_stock(): void
    {
        $bundle = Bundle::with('items')->first();
        $bundle->forceFill(['is_active' => true])->save();

        $this->signInAs($this->admin());
        $this->post("/api/admin/bundles/{$bundle->id}/photo", [
            'photo' => UploadedFile::fake()->image('x.jpg', 800, 800),
        ])->assertOk();

        Product::find($bundle->items->first()->product_id)->update(['in_stock' => false]);

        $this->assertSame([], $this->getJson('/api/catalogue')->json('bundles'));
    }
}
