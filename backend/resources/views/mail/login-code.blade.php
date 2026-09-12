<x-mail::message>
# {{ $strings['greeting'] }}

{{ $strings['intro'] }}

<x-mail::panel>
# {{ $code }}
</x-mail::panel>

{{ str_replace(':minutes', (string) $minutes, $strings['expiry']) }}

{{ $strings['ignore'] }}

**{{ $strings['never'] }}**

<x-mail::subcopy>
Freshness To Your Home — {{ config('freshness.support.phone') }}
</x-mail::subcopy>
</x-mail::message>
