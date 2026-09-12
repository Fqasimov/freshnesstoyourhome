<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestLoginCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // `email:filter` applies PHP's own validator rather than only a
            // regex, and the length cap keeps a megabyte of "address" from
            // reaching the hasher.
            'email' => ['required', 'string', 'email:filter', 'max:190'],
            'locale' => ['sometimes', 'string', Rule::in(['az', 'ru', 'en'])],
        ];
    }
}
