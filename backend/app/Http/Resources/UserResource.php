<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * What the app is told about the signed-in customer.
 *
 * An explicit whitelist, not the model's attributes: `role`, `email_hash` and
 * the timestamps around blocking are none of the client's business, and a
 * resource that serialises whatever the model happens to hold leaks the next
 * column somebody adds.
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'name' => $this->name,
            'phone' => $this->phone,
            'locale' => $this->locale,
            // Drives the "finish your profile" screen. A courier needs a name
            // and a number to deliver anything, so checkout refuses without.
            'profile_complete' => filled($this->name) && filled($this->phone),
        ];
    }
}
