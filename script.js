$(document).ready(function() {
    // 最大ファイルサイズ（15MB）
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    // 許可する画像の種類
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic'];
    // 許可する拡張子
    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic'];

    // メッセージ入力欄の文字数をカウントして表示する
    $('#message').on('input', function() {
        const length = $(this).val().length;
        $('#charCount').text(length);
        validateForm();
    });

    // カテゴリーが変更されたときにフォームのチェックを行う
    $('#category').on('change', function() {
        validateForm();
    });

    // 画像が選択されたときの処理
    $('#image').on('change', function(e) {
        const file = e.target.files[0];
        
        if (file) {
            // ファイル名から拡張子をチェック
            const fileName = file.name.toLowerCase();
            const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
            
            if (!hasValidExtension) {
                showError('対応していないファイル形式です。JPG、PNG、HEICのみ使用できます。');
                $(this).val('');
                $('#imagePreview').addClass('hidden');
                return;
            }

            // ファイルサイズが大きすぎないかチェック
            if (file.size > MAX_FILE_SIZE) {
                showError('ファイルサイズが大きすぎます。15MB以下のファイルを選択してください。');
                $(this).val('');
                $('#imagePreview').addClass('hidden');
                return;
            }

            // 画像のプレビューを表示（HEIC以外）
            if (file.type && file.type.startsWith('image/') && file.type !== 'image/heic') {
                const reader = new FileReader();
                reader.onload = function(e) {
                    $('#previewImg').attr('src', e.target.result);
                    $('#imagePreview').removeClass('hidden');
                };
                reader.readAsDataURL(file);
            } else if (fileName.endsWith('.heic')) {
                // HEIC画像の場合は「プレビューは表示されません」と表示
                $('#imagePreview').html('<p class="text-sm text-gray-600">HEIC画像が選択されました（プレビューは表示されません）</p>').removeClass('hidden');
            }
        } else {
            // 画像が選択されていない場合はプレビューを非表示
            $('#imagePreview').addClass('hidden');
        }
        
        validateForm();
    });

    // フォームの入力内容が正しいかチェックする関数
    function validateForm() {
        const category = $('#category').val();
        const message = $('#message').val().trim();
        const messageLength = message.length;
        
        // カテゴリーが選択され、メッセージが1文字以上1000文字以下ならOK
        const isValid = category && messageLength >= 1 && messageLength <= 1000;
        
        // 送信ボタンの有効・無効を切り替える
        $('#submitBtn').prop('disabled', !isValid);
        return isValid;
    }

    // フォームが送信されたときの処理
    let pendingSubmit = false;
    $('#feedbackForm').on('submit', function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        // 送信確認モーダルを表示
        $('#confirmModal').fadeIn(150);
        pendingSubmit = true;
    });

    // モーダルのキャンセルボタン
    $(document).on('click', '#modalCancel', function() {
        $('#confirmModal').fadeOut(150);
        pendingSubmit = false;
    });

    // モーダルのOKボタン
    $(document).on('click', '#modalOk', function() {
        if (!pendingSubmit) return;
        $('#confirmModal').fadeOut(150);
        pendingSubmit = false;

        // ここから送信処理
        const formData = new FormData();
        formData.append('category', $('#category').val());
        formData.append('message', $('#message').val().trim());
        const imageFile = $('#image')[0].files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        $('#submitBtn').prop('disabled', true).text('送信中...');
        
        $.ajax({
            url: 'submit.php',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.status === 'ok') {
                    // 送信完了メッセージを表示
                    let html = '<h2 class="text-xl font-bold mb-4">送信完了いたしました。</h2>';
                    html += '<p class="mb-6">メッセージをお送りいただきありがとうございます。<br>ご要望や問題点は速やかに確認し、改善に励みます。</p>';
                    
                    $('#feedbackForm').hide();
                    $('h1').hide();
                    $('#completeMessage').html(html).show();
                    
                    // 過去の投稿履歴を読み込んで表示
                    loadPastReports();
                } else {
                    showError(response.message || 'エラーが発生しました。');
                }
            },
            error: function(xhr, status, error) {
                console.error('Ajax error:', status, error);
                showError('通信エラーが発生しました。もう一度お試しください。');
            },
            complete: function() {
                $('#submitBtn').prop('disabled', false).text('送信');
                validateForm();
            }
        });
    });

    // 成功時のトースト通知を表示する関数
    function showToast(message) {
        $('#toastMessage').text(message);
        $('#toast').removeClass('translate-x-full');
        
        setTimeout(function() {
            $('#toast').addClass('translate-x-full');
        }, 3000);
    }

    // エラー時のアラートを表示する関数
    function showError(message) {
        alert('エラー: ' + message);
    }

    // ページ表示時にフォームを表示（パスワード認証を一時的に無効化）
    $('#feedbackForm').show();
    $('h1').show();
    $('#completeMessage').hide();
    $('#passwordModal').hide(); // パスワードモーダルを非表示

    // パスワード認証処理（一時的に無効化）
    /*
    $('#passwordSubmit').on('click', function() {
        const pw = $('#accessPassword').val();
        if (pw === 'maimai') {
            $('#passwordModal').fadeOut(200);
            $('#feedbackForm').show();
            $('h1').show();
        } else {
            $('#passwordError').show();
        }
    });
    // エンターキーでも送信
    $('#accessPassword').on('keypress', function(e) {
        if (e.which === 13) {
            $('#passwordSubmit').click();
        }
    });
    */

    // 過去の投稿履歴を読み込んで表示する関数
    function loadPastReports() {
        $.ajax({
            url: 'read.php',
            type: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.status === 'ok' && response.data && response.data.length > 0) {
                    let historyHtml = '<div class="mt-8 border-t pt-6">';
                    historyHtml += '<h3 class="text-lg font-bold mb-4">過去の投稿履歴</h3>';
                    historyHtml += '<div class="space-y-4 max-h-96 overflow-y-auto">';
                    
                    // 最新のものから順に表示（配列を逆順にする）
                    const reversedData = response.data.slice().reverse();
                    
                    reversedData.forEach(function(row, index) {
                        if (row.length >= 3) {
                            const timestamp = row[0] || '';
                            const category = row[1] || '';
                            const message = row[2] || '';
                            const image = row[3] || '';
                            
                            historyHtml += '<div class="bg-gray-50 p-4 rounded-lg border">';
                            historyHtml += '<div class="flex justify-between items-start mb-2">';
                            historyHtml += '<span class="text-sm font-medium text-blue-600">' + escapeHtml(category) + '</span>';
                            historyHtml += '<span class="text-xs text-gray-500">' + escapeHtml(timestamp) + '</span>';
                            historyHtml += '</div>';
                            historyHtml += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + escapeHtml(message) + '</p>';
                            
                            if (image) {
                                historyHtml += '<div class="mt-2">';
                                historyHtml += '<span class="text-xs text-gray-500">画像: ' + escapeHtml(image) + '</span>';
                                historyHtml += '</div>';
                            }
                            historyHtml += '</div>';
                        }
                    });
                    
                    historyHtml += '</div>';
                    historyHtml += '</div>';
                    historyHtml += '<button id="backToTop" class="mt-6 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">トップ</button>';
                    
                    $('#completeMessage').append(historyHtml);
                    
                    // トップボタンのイベント
                    $('#backToTop').on('click', function() {
                        location.href = './index.html';
                    });
                } else {
                    // データがない場合もトップボタンを表示
                    let buttonHtml = '<button id="backToTop" class="mt-6 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">トップ</button>';
                    $('#completeMessage').append(buttonHtml);
                    $('#backToTop').on('click', function() {
                        location.href = './index.html';
                    });
                }
            },
            error: function() {
                console.error('投稿履歴の読み込みに失敗しました');
                // エラーでもトップボタンを表示
                let buttonHtml = '<button id="backToTop" class="mt-6 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">トップ</button>';
                $('#completeMessage').append(buttonHtml);
                $('#backToTop').on('click', function() {
                    location.href = './index.html';
                });
            }
        });
    }

    // HTMLエスケープ関数
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ページ読み込み時に初期チェックを行う
    validateForm();
});