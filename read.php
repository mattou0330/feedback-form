<?php
header('Content-Type: application/json; charset=utf-8');

// デバッグ用
error_reporting(E_ALL);
ini_set('display_errors', 0);

// CSVファイルのパス
$csvFile = __DIR__ . '/reports.csv';

// ファイルが存在しない場合は空配列を返す
if (!file_exists($csvFile)) {
    sendResponse('ok', 'データがありません。', []);
}

try {
    // ファイル内容を取得
    $content = file_get_contents($csvFile);
    if ($content === false) {
        sendResponse('error', 'ファイルの読み込みに失敗しました。');
    }
    
    // BOMを除去
    if (strpos($content, "\xEF\xBB\xBF") === 0) {
        $content = substr($content, 3);
    }
    
    // データを配列に変換
    $data = [];
    $lines = explode("\n", $content);
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (!empty($line)) {
            $row = str_getcsv($line);
            if (count($row) >= 3) { // 最低限のデータがある行のみ
                $data[] = $row;
            }
        }
    }
    
    sendResponse('ok', 'データの取得に成功しました。', $data);
    
} catch (Exception $e) {
    sendResponse('error', 'データの読み込み中にエラーが発生しました: ' . $e->getMessage());
}

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