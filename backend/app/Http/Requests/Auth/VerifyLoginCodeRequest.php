<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class VerifyLoginCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $length = (int) config('freshness.auth.code_length');

        return [
            'email' => ['required', 'string', 'email:filter', 'max:190'],
            // Digits only, exact length. Anything else is not a code we ever
            // issued, so it is rejected before it costs a bcrypt comparison.
            'code' => ['required', 'string', 'regex:/^\d{'.$length.'}$/'],
            // Names the token so a customer can tell their devices apart when
            // they revoke one. Never trusted for anything else.
            'device_name' => ['sometimes', 'string', 'max:60'],
        ];
    }
}
