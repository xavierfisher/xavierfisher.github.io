<?php
// Simple proxy for the Trellis leaderboard.
// Only allows the specific user.php endpoint to prevent abuse.
header('Access-Control-Allow-Origin: *');
header('Content-Type: text/html; charset=utf-8');

$url = isset($_GET['url']) ? $_GET['url'] : '';

// Whitelist: only allow the trellis user endpoint
$allowed = 'https://trellis.consciousb.one/web/user.php?id=';
if (strpos($url, $allowed) !== 0) {
    http_response_code(400);
    echo 'Invalid URL';
    exit;
}

// Extra safety: id must be numeric
$id = substr($url, strlen($allowed));
if (!ctype_digit($id)) {
    http_response_code(400);
    echo 'Invalid ID';
    exit;
}

$ctx = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 10,
        'header' => "User-Agent: Mozilla/5.0 LeaderboardBot\r\n"
    ]
]);

$body = @file_get_contents($url, false, $ctx);
if ($body === false) {
    http_response_code(502);
    echo 'Upstream fetch failed';
    exit;
}

echo $body;