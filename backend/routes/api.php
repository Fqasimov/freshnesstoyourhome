<?php

use App\Http\Controllers\Api\Admin\AuditController;
use App\Http\Controllers\Api\Admin\BundleController;
use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\CustomerController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\DeliveryZoneController;
use App\Http\Controllers\Api\Admin\ProductController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PanelAuthController;
use App\Http\Controllers\Api\CatalogueController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PushTokenController;
use App\Http\Controllers\Api\StaffOrderController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Freshness To Your Home — customer API
|--------------------------------------------------------------------------
|
| Three tiers, and the boundary between them is the point of this file.
|
|  - Public: browsing the catalogue and asking for a sign-in code.
|  - Signed in: everything about one's own profile, addresses and orders.
|  - Staff: the shop's own view, gated on the role stored in the database.
|  - Admin: the shop's own settings — prices, stock, bundles, zones.
|
| Every route that writes is rate limited. The named limiters are defined in
| AppServiceProvider.
*/

// ---------------------------------------------------------------- public ---

Route::get('catalogue', [CatalogueController::class, 'index'])
    ->middleware('throttle:catalogue');

// Pricing a basket is public, and deliberately so. A customer builds a basket
// before they have an account — an app that demands a sign-in to show a total
// is both worse to use and the shape App Store review rejects as an empty
// shell. The endpoint reads the catalogue and a delivery zone and returns
// arithmetic over them; it touches nothing that belongs to anybody.
Route::post('orders/quote', [OrderController::class, 'quote'])
    ->middleware('throttle:catalogue');

Route::prefix('auth')->group(function () {
    // Tightly limited: this endpoint sends mail on request, which makes it the
    // most abusable route in the system. See LoginCodeService for the three
    // budgets behind it.
    Route::post('request-code', [AuthController::class, 'requestCode'])
        ->middleware('throttle:otp-request');

    // Limited separately, because guessing codes and asking for codes are
    // different attacks with different shapes.
    Route::post('verify-code', [AuthController::class, 'verifyCode'])
        ->middleware('throttle:otp-verify');

    // The admin panel's own door. Only addresses in ADMIN_EMAILS get a code
    // or a token here, and the token it issues is the only kind the admin
    // routes accept. Tighter limits than the shop's: one person uses this.
    Route::post('panel/request-code', [PanelAuthController::class, 'requestCode'])
        ->middleware(['throttle:otp-request', 'throttle:panel-auth']);
    Route::post('panel/verify-code', [PanelAuthController::class, 'verifyCode'])
        ->middleware(['throttle:otp-verify', 'throttle:panel-auth']);
    Route::post('panel/two-factor', [PanelAuthController::class, 'twoFactor'])
        ->middleware('throttle:panel-auth');
});

// ------------------------------------------------------------- signed in ---

Route::middleware(['auth:sanctum', 'blocked'])->group(function () {
    Route::get('me', [AuthController::class, 'me']);
    Route::patch('me', [ProfileController::class, 'update']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::post('auth/logout-all', [AuthController::class, 'logoutAll']);

    // Apple Guideline 5.1.1(v): deleting the account has to be possible from
    // inside the app, not only by emailing someone.
    Route::delete('me', [AuthController::class, 'deleteAccount']);

    Route::apiResource('addresses', AddressController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    // Order updates by push. Registering is idempotent and called on every
    // launch, because the OS can reissue a token at any time and a stale one
    // stops working silently.
    Route::post('push-tokens', [PushTokenController::class, 'store']);
    Route::delete('push-tokens', [PushTokenController::class, 'destroy']);

    Route::get('orders', [OrderController::class, 'index']);
    Route::get('orders/{id}', [OrderController::class, 'show']);
    Route::post('orders', [OrderController::class, 'store'])
        ->middleware('throttle:place-order');
    Route::post('orders/{id}/cancel', [OrderController::class, 'cancel']);
});

// ----------------------------------------------------------------- staff ---

Route::middleware(['auth:sanctum', 'blocked', 'role:courier,admin'])
    ->prefix('staff')
    ->group(function () {
        Route::get('orders', [StaffOrderController::class, 'index']);
        Route::get('orders/{id}', [StaffOrderController::class, 'show']);
        Route::post('orders/{id}/transition', [StaffOrderController::class, 'transition']);
        Route::post('orders/{id}/weights', [StaffOrderController::class, 'confirmWeights']);
    });

// ----------------------------------------------------------------- admin ---

/*
| Everything a shopkeeper changes, and nothing a shopkeeper should not.
|
| `role:admin` alone, not `role:courier,admin`: a courier moves orders along
| and records weights, and has no business editing the price list.
|
| Two things are deliberately missing and should stay missing. There is no
| route that changes a user's role — admins are named in ADMIN_EMAILS and
| couriers appointed by a console command, both on the server, so a stolen
| admin session cannot mint a second admin that outlives it. And there is no
| route that deletes an audit row.
|
| `role:admin` also wants a token from auth/panel/verify-code; see AdminAccess.
|
| Writes are rate limited as a blast radius control rather than as abuse
| prevention: these callers are trusted, and a loop that empties the shelves
| by accident is still an outage.
*/
Route::middleware(['auth:sanctum', 'blocked', 'role:admin', 'throttle:admin'])
    ->prefix('admin')
    ->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index']);

        Route::get('products', [ProductController::class, 'index']);
        Route::post('products', [ProductController::class, 'store']);
        Route::patch('products/{id}', [ProductController::class, 'update']);
        Route::post('products/stock', [ProductController::class, 'stock']);

        // Separate limiter: an upload costs disk and a few hundred milliseconds
        // of image decoding, where the rest of this group costs a query.
        Route::post('products/{id}/photo', [ProductController::class, 'photo'])
            ->middleware('throttle:admin-upload');
        Route::delete('products/{id}/photo', [ProductController::class, 'removePhoto']);

        Route::get('categories', [CategoryController::class, 'index']);
        Route::patch('categories/{id}', [CategoryController::class, 'update']);

        Route::get('bundles', [BundleController::class, 'index']);
        Route::patch('bundles/{id}', [BundleController::class, 'update']);
        Route::post('bundles/{id}/photo', [BundleController::class, 'photo'])
            ->middleware('throttle:admin-upload');
        Route::delete('bundles/{id}/photo', [BundleController::class, 'removePhoto']);

        Route::get('zones', [DeliveryZoneController::class, 'index']);
        Route::patch('zones/{id}', [DeliveryZoneController::class, 'update']);

        Route::get('customers', [CustomerController::class, 'index']);
        Route::get('customers/{id}', [CustomerController::class, 'show']);
        Route::post('customers/{id}/block', [CustomerController::class, 'block']);

        Route::get('audits', [AuditController::class, 'index']);
        Route::get('audits/verify', [AuditController::class, 'verify']);
    });
