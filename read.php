<?php
// CSVファイルのパス
$csvFile = __DIR__ . '/data.csv';

// ファイルが存在しない場合は空配列を返す
if (!file_exists($csvFile)) {
    sendResponse('ok', 'データがありません。', []);
}

// ファイルを開く
$fileHandle = fopen($csvFile, 'r');
if (!$fileHandle) {
    sendResponse('error', 'データの読み込みに失敗しました。');
}

// BOMをスキップ
$firstLine = fgets($fileHandle);
if (strpos($firstLine, "\xEF\xBB\xBF") === 0) {
    $firstLine = substr($firstLine, 3);
}
rewind($fileHandle);

// データを配列に格納
$data = [];
while (($row = fgetcsv($fileHandle)) !== false) {
    $data[] = $row;
}
fclose($fileHandle);

sendResponse('ok', 'データの取得に成功しました。', $data);

/**
 * レスポンスをJSON形式で返して終了する関数
 */
function sendResponse($status, $message, $data = null) {
    $response = [
        'status' => $status,
        'message' => $message
    ];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}