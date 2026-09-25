<?php

namespace Tests\Feature;

use App\Models\AdminAudit;
use App\Models\Product;
use App\Models\User;
use App\Support\StoredImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Uploading product photographs.
 *
 * An upload form is the widest door in any admin panel: it takes a file from
 * outside and puts it on the server's own disk, under the server's own domain,
 * where a stored payload reaches the next person to open the page. So most of
 * what is tested here is not "does the picture appear" but "is the thing on
 * disk ours".
 */
class ProductPhotoTest extends TestCase
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

    // ------------------------------------------------------------ storing ---

    public function test_an_upload_is_stored_with_a_thumbnail(): void
    {
        $this->signInAs($this->admin());

        $body = $this->post('/api/admin/products/smoked-salmon/photo', [
            'photo' => UploadedFile::fake()->image('fish.jpg', 1800, 1200),
        ])->assertOk()->json();

        $this->assertTrue($body['has_upload']);
        $this->assertNotNull($body['image_url']);
        $this->assertNotNull($body['thumb_url']);

        $stored = Product::find('smoked-salmon')->image_file;
        Storage::disk('public')->assertExists($stored);
        Storage::disk('public')->assertExists(StoredImage::thumbPath($stored));
    }

    /** The name the client chose is never the name on disk. */
    public function test_the_uploaded_filename_is_not_used(): void
    {
        $this->signInAs($this->admin());

        $this->post('/api/admin/products/smoked-salmon/photo', [
            'photo' => UploadedFile::fake()->image('../../../etc/passwd.jpg', 900, 900),
        ])->assertOk();

        $stored = Product::find('smoked-salmon')->image_file;

        $this->assertStringStartsWith('products/', $stored);
        $this->assertStringNotContainsString('..', $stored);
        $this->assertStringNotContainsString('passwd', $stored);
        $this->assertMatchesRegularExpression('#^products/[0-9a-f-]{36}\.jpg$#', $stored);
    }

    /**
     * The reason the file is decoded and written out again.
     *
     * A JPEG with a script appended is still a valid JPEG — getimagesize reads
     * the header and is happy, and every "check the mime type" defence passes
     * it. What kills it is that only the pixels survive re-encoding.
     */
    public function test_anything_hidden_after_the_image_data_does_not_survive(): void
    {
        $this->signInAs($this->admin());

        $payload = '<?php system($_GET["c"]); ?>';
        $path = tempnam(sys_get_temp_dir(), 'poly').'.jpg';
        file_put_contents($path, UploadedFile::fake()->image('ok.jpg', 800, 600)->get().$payload);

        $this->post('/api/admin/products/smoked-salmon/photo', [
            'photo' => new UploadedFile($path, 'ok.jpg', 'image/jpeg', null, true),
        ])->assertOk();

        $stored = Product::find('smoked-salmon')->image_file;
        $bytes = Storage::disk('public')->get($stored);

        $this->assertStringNotContainsString($payload, $bytes);
        $this->assertStringNotContainsString('<?php', $bytes);
        // And what is there is a real JPEG, not an empty file.
        $this->assertSame("\xFF\xD8\xFF", substr($bytes, 0, 3));
    }

    public function test_a_file_that_is_not_an_image_is_refused(): void
    {
        $this->signInAs($this->admin());

        foreach ([
            UploadedFile::fake()->create('invoice.pdf', 40, 'application/pdf'),
            UploadedFile::fake()->create('shell.php.jpg', 4, 'image/jpeg'),
            UploadedFile::fake()->create('logo.svg', 2, 'image/svg+xml'),
        ] as $file) {
            $this->post('/api/admin/products/smoked-salmon/photo', ['photo' => $file])
                ->assertStatus(422);
        }

        $this->assertNull(Product::find('smoked-salmon')->image_file);
    }

    public function test_an_oversized_file_is_refused(): void
    {
        $this->signInAs($this->admin());

        $this->post('/api/admin/products/smoked-salmon/photo', [
            'photo' => UploadedFile::fake()->create('huge.jpg', 9_000, 'image/jpeg'),
        ])->assertStatus(422);
    }

    /** The photograph is resized rather than served at whatever size it arrived. */
    public function test_a_large_photograph_is_scaled_down(): void
    {
        $this->signInAs($this->admin());

        $this->post('/api/admin/products/smoked-salmon/photo', [
            'photo' => UploadedFile::fake()->image('big.jpg', 4000, 3000),
        ])->assertOk();

        $stored = Product::find('smoked-salmon')->image_file;
        [$w, $h] = getimagesizefromstring(Storage::disk('public')->get($stored));

        $this->assertLessThanOrEqual(1400, max($w, $h));
        // Same shape as it arrived, not squashed into a square.
        $this->assertEqualsWithDelta(4000 / 3000, $w / $h, 0.01);

        [$tw] = getimagesizefromstring(
            Storage::disk('public')->get(StoredImage::thumbPath($stored))
        );
        $this->assertLessThanOrEqual(360, $tw);
    }

    // ----------------------------------------------------------- replacing ---

    public function test_replacing_a_photograph_removes_the_old_files(): void
    {
        $this->signInAs($this->admin());

        $this->post('/api/admin/products/smoked-salmon/photo', [
            'photo' => UploadedFile::fake()->image('one.jpg', 900, 900),
        ])->assertOk();
        $first = Product::find('smoked-salmon')->image_file;

        $this->post('/api/admin/products/smoked-salmon/photo', [
            'photo' => UploadedFile::fake()->image('two.jpg', 900, 900),
        ])->assertOk();
        $second = Product::find('smoked-salmon')->image_file;

        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertMissing(StoredImage::thumbPath($first));
        Storage::disk('public')->assertExists($second);
    }

    public function test_removing_a_photograph_falls_back_to_the_bundled_one(): void
    {
        $this->signInAs($this->admin());

        $this->post('/api/admin/products/smoked-salmon/photo', [
            'photo' => UploadedFile::fake()->image('x.jpg', 900, 900),
        ])->assertOk();
        $stored = Product::find('smoked-salmon')->image_file;

        $body = $this->deleteJson('/api/admin/products/smoked-salmon/photo')->assertOk()->json();

        $this->assertFalse($body['has_upload']);
        $this->assertNull($body['image_url']);
        // The picture that ships in the app and the website is still named.
        $this->assertSame('smoked-salmon.jpg', $body['image']);
        Storage::disk('public')->assertMissing($stored);
    }

    // -------------------------------------------------------- the catalogue ---

    public function test_the_photograph_reaches_the_public_catalogue(): void
    {
        $this->getJson('/api/catalogue')->assertOk();   // warm the cache first

        $this->signInAs($this->admin());
        $this->post('/api/admin/products/smoked-salmon/photo', [
            'photo' => UploadedFile::fake()->image('x.jpg', 900, 900),
        ])->assertOk();

        $row = collect($this->getJson('/api/catalogue')->json('products'))
            ->firstWhere('id', 'smoked-salmon');

        $this->assertNotNull($row['image_url']);
        // Both keys travel together, so a client that predates uploads keeps
        // rendering the picture it already has.
        $this->assertSame('smoked-salmon.jpg', $row['image']);
    }

    // ------------------------------------------------------------- access ---

    public function test_only_an_admin_can_upload(): void
    {
        $courier = User::factory()->create();
        $courier->promote(User::ROLE_COURIER);

        foreach ([User::factory()->create(), $courier->fresh()] as $user) {
            $this->signInAs($user);
            $this->post('/api/admin/products/smoked-salmon/photo', [
                'photo' => UploadedFile::fake()->image('x.jpg', 900, 900),
            ])->assertNotFound();
        }

        $this->assertNull(Product::find('smoked-salmon')->image_file);
    }

    public function test_an_upload_is_recorded(): void
    {
        $this->signInAs($this->admin());

        $this->post('/api/admin/products/smoked-salmon/photo', [
            'photo' => UploadedFile::fake()->image('x.jpg', 900, 900),
        ])->assertOk();

        $this->assertDatabaseHas('admin_audits', [
            'action' => 'product.photo',
            'subject_id' => 'smoked-salmon',
        ]);
    }

    /** A path cannot be pointed somewhere by hand. */
    public function test_the_stored_path_cannot_be_set_through_the_edit_endpoint(): void
    {
        $this->signInAs($this->admin());

        $this->patchJson('/api/admin/products/smoked-salmon', [
            'image_file' => 'products/../../../.env',
            'price_minor' => 6_000,
        ])->assertOk();

        $this->assertNull(Product::find('smoked-salmon')->image_file);
    }
}
