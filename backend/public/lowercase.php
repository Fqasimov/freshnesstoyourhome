<?php

/*
 * Addresses typed or linked with capitals — /KATALOQ, /Mehsul/levrek,
 * /RU/kataloq — moved for good to the same address in lower case, which is
 * the only form the shop uses. Apache's .htaccess cannot lower-case a URL on
 * its own, so public_html/.htaccess hands such requests here (internally;
 * the visitor sees one 301). Plain PHP, outside Laravel: nothing to boot.
 *
 * Only a plain path is accepted, so the answer can only ever be a path on
 * this site: no scheme, no host, no "//" that a browser would read as one.
 */
$uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
[$path, $query] = array_pad(explode('?', $uri, 2), 2, null);

$lower = strtolower($path);
if (
    $lower === $path
    || ! preg_match('#^/[a-z0-9/_.-]*$#', $lower)
    || str_starts_with($lower, '//')
    || str_contains($lower, '/../')
) {
    http_response_code(404);
    exit;
}

header('Cache-Control: public, max-age=86400');
header('Location: '.$lower.($query !== null && $query !== '' ? '?'.$query : ''), true, 301);
