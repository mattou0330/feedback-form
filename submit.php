<?php
date_default_timezone_set('Asia/Tokyo');
header('Content-Type: application/json; charset=utf-8');

// デバッグ用：エラーを表示（本番環境では無効にする）
error_reporting(E_ALL);
ini_set('display_errors', 0);

// 設定（アップロード先やファイルサイズなど）
$uploadDir = __DIR__ . '/uploads/'; // 画像を保存するディレクトリ
$csvFile = __DIR__ . '/reports.csv'; // フィードバック内容を保存するCSVファイル
$maxFileSize = 15 * 1024 * 1024; // 画像の最大サイズ（15MB）
$allowedExtensions = ['jpg', 'jpeg', 'png', 'heic']; // 許可する画像の拡張子

// アップロード用ディレクトリがなければ作成
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        sendResponse('error', 'アップロードディレクトリの作成に失敗しました。');
    }
}

// POSTリクエスト以外は受け付けない
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse('error', '不正なリクエストです。');
}

// カテゴリーのチェック
$category = isset($_POST['category']) ? trim($_POST['category']) : '';
$validCategories = ['問題報告', '要望', 'お礼', 'アドバイス', 'その他'];

if (empty($category) || !in_array($category, $validCategories)) {
    sendResponse('error', 'カテゴリーを選択してください。');
}

// メッセージのチェック
$message = isset($_POST['message']) ? trim($_POST['message']) : '';
$messageLength = mb_strlen($message, 'UTF-8');

if ($messageLength < 1 || $messageLength > 1000) {
    sendResponse('error', 'メッセージは1〜1000文字で入力してください。');
}

// 画像アップロードの処理
$imageFilename = '';
if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
    // 画像アップロード時のエラーチェック
    if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE => 'ファイルサイズが大きすぎます。',
            UPLOAD_ERR_FORM_SIZE => 'ファイルサイズが大きすぎます。',
            UPLOAD_ERR_PARTIAL => 'ファイルの一部しかアップロードされませんでした。',
            UPLOAD_ERR_NO_TMP_DIR => '一時フォルダが見つかりません。',
            UPLOAD_ERR_CANT_WRITE => 'ファイルの書き込みに失敗しました。',
            UPLOAD_ERR_EXTENSION => 'PHPの拡張モジュールがファイルアップロードを停止しました。'
        ];
        
        $errorMessage = isset($uploadErrors[$_FILES['image']['error']]) 
            ? $uploadErrors[$_FILES['image']['error']] 
            : 'ファイルアップロードエラーが発生しました。';
            
        sendResponse('error', $errorMessage);
    }
    
    // ファイルサイズのチェック
    if ($_FILES['image']['size'] > $maxFileSize) {
        sendResponse('error', 'ファイルサイズが大きすぎます。15MB以下のファイルを選択してください。');
    }
    
    // 拡張子のチェック
    $originalFilename = $_FILES['image']['name'];
    $extension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));
    
    if (!in_array($extension, $allowedExtensions)) {
        sendResponse('error', '対応していないファイル形式です。JPG、PNG、HEICのみ使用できます。');
    }
    
    // ファイル名をユニークなものにする（重複防止）
    $imageFilename = date('YmdHis') . '_' . uniqid() . '.' . $extension;
    $uploadPath = $uploadDir . $imageFilename;
    
    // 画像ファイルを保存
    if (!move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
        sendResponse('error', 'ファイルの保存に失敗しました。');
    }
}

// CSVに保存するデータを用意
$timestamp = date('Y-m-d H:i:s'); // 受信日時
$csvData = [
    $timestamp,
    $category,
    str_replace(["\r", "\n", ","], [' ', ' ', '，'], $message), // 改行やカンマを置き換え
    $imageFilename
];

// CSVファイルに書き込み
$fileHandle = fopen($csvFile, 'a');
if ($fileHandle === false) {
    // 画像がアップロードされていた場合は削除
    if ($imageFilename && file_exists($uploadPath)) {
        unlink($uploadPath);
    }
    sendResponse('error', 'データの保存に失敗しました。');
}

// ファイルをロックして同時書き込みを防ぐ
if (flock($fileHandle, LOCK_EX)) {
    // ファイルが空の場合はExcel用にBOMを書き込む
    if (filesize($csvFile) === 0) {
        fwrite($fileHandle, "\xEF\xBB\xBF");
    }
    
    // データを書き込む
    fputcsv($fileHandle, $csvData);
    flock($fileHandle, LOCK_UN);
} else {
    fclose($fileHandle);
    // 画像がアップロードされていた場合は削除
    if ($imageFilename && file_exists($uploadPath)) {
        unlink($uploadPath);
    }
    sendResponse('error', 'データの保存に失敗しました。');
}

fclose($fileHandle);

// 成功時のレスポンスを返す
sendResponse('ok', 'フィードバックを送信しました。ありがとうございました。');

/**
 * レスポンスをJSON形式で返して終了する関数
 */
function sendResponse($status, $message) {
    echo json_encode([
        'status' => $status,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}