<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AuthController;
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
        Route::post('orders/{id}/transition', [StaffOrderController::class, 'transition']);
        Route::post('orders/{id}/weights', [StaffOrderController::class, 'confirmWeights']);
    });
