<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /**
     * Update the customer's own details.
     *
     * The validated array holds exactly three keys, and `role` is not one of
     * them — nor is it fillable on the model. Both halves matter: a whitelist
     * here and a guard there, so neither one being edited by mistake is enough
     * to hand out an admin account.
     */
    public function update(Request $request): UserResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:80'],
            'phone' => ['sometimes', 'string', 'max:24', 'regex:/^[0-9+()\-\s]{7,24}$/'],
            'locale' => ['sometimes', Rule::in(['az', 'ru', 'en'])],
        ]);

        $user = $request->user();
        $user->fill($data);
        $user->save();

        return new UserResource($user);
    }
}
