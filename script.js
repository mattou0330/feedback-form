document.addEventListener('DOMContentLoaded', function() {
    // 最大ファイルサイズ（15MB）
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    // 許可する画像の種類
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic'];
    // 許可する拡張子
    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic'];

    // DOMエレメントを取得
    const messageInput = document.getElementById('message');
    const charCountEl = document.getElementById('charCount');
    const categorySelect = document.getElementById('category');
    const imageInput = document.getElementById('image');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const submitBtn = document.getElementById('submitBtn');
    const feedbackForm = document.getElementById('feedbackForm');
    const completeMessage = document.getElementById('completeMessage');
    const confirmModal = document.getElementById('confirmModal');
    const passwordModal = document.getElementById('passwordModal');
    const passwordSubmit = document.getElementById('passwordSubmit');
    const accessPassword = document.getElementById('accessPassword');
    const passwordError = document.getElementById('passwordError');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // メッセージ入力欄の文字数をカウントして表示する
    messageInput.addEventListener('input', function() {
        const length = this.value.length;
        charCountEl.textContent = length;
        validateForm();
    });

    // カテゴリーが変更されたときにフォームのチェックを行う
    categorySelect.addEventListener('change', function() {
        validateForm();
    });

    // 画像が選択されたときの処理
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (file) {
            // ファイル名から拡張子をチェック
            const fileName = file.name.toLowerCase();
            const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
            
            if (!hasValidExtension) {
                showError('対応していないファイル形式です。JPG、PNG、HEICのみ使用できます。');
                this.value = '';
                imagePreview.classList.add('hidden');
                return;
            }

            // ファイルサイズが大きすぎないかチェック
            if (file.size > MAX_FILE_SIZE) {
                showError('ファイルサイズが大きすぎます。15MB以下のファイルを選択してください。');
                this.value = '';
                imagePreview.classList.add('hidden');
                return;
            }

            // 画像のプレビューを表示（HEIC以外）
            if (file.type && file.type.startsWith('image/') && file.type !== 'image/heic') {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    imagePreview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } else if (fileName.endsWith('.heic')) {
                // HEIC画像の場合は「プレビューは表示されません」と表示
                imagePreview.innerHTML = '<p class="text-sm text-gray-600">HEIC画像が選択されました（プレビューは表示されません）</p>';
                imagePreview.classList.remove('hidden');
            }
        } else {
            // 画像が選択されていない場合はプレビューを非表示
            imagePreview.classList.add('hidden');
        }
        
        validateForm();
    });

    // フォームの入力内容が正しいかチェックする関数
    function validateForm() {
        const category = categorySelect.value;
        const message = messageInput.value.trim();
        const messageLength = message.length;
        
        // カテゴリーが選択され、メッセージが1文字以上1000文字以下ならOK
        const isValid = category && messageLength >= 1 && messageLength <= 1000;
        
        // 送信ボタンの有効・無効を切り替える
        submitBtn.disabled = !isValid;
        return isValid;
    }

    // フォームが送信されたときの処理
    let pendingSubmit = false;
    feedbackForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        // 送信確認モーダルを表示
        confirmModal.style.display = 'flex';
        pendingSubmit = true;
    });

    // モーダルのキャンセルボタン
    document.addEventListener('click', function(e) {
        if (e.target.id === 'modalCancel') {
            confirmModal.style.display = 'none';
            pendingSubmit = false;
        }
    });

    // モーダルのOKボタン
    document.addEventListener('click', function(e) {
        if (e.target.id === 'modalOk') {
            if (!pendingSubmit) return;
            confirmModal.style.display = 'none';
            pendingSubmit = false;

            // ここから送信処理
            const formData = new FormData();
            formData.append('category', categorySelect.value);
            formData.append('message', messageInput.value.trim());
            const imageFile = imageInput.files[0];
            if (imageFile) {
                formData.append('image', imageFile);
            }
            submitBtn.disabled = true;
            submitBtn.textContent = '送信中...';
            
            fetch('submit.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'ok') {
                    // 送信完了メッセージを表示
                    let html = '<h2 class="text-xl font-bold mb-4">送信完了いたしました。</h2>';
                    html += '<p class="mb-6">メッセージをお送りいただきありがとうございます。<br>ご要望や問題点は速やかに確認し、改善に励みます。</p>';
                    
                    feedbackForm.style.display = 'none';
                    document.querySelector('h1').style.display = 'none';
                    completeMessage.innerHTML = html;
                    completeMessage.style.display = 'block';
                    
                    // 過去の投稿履歴を読み込んで表示
                    loadPastReports();
                } else {
                    showError(data.message || 'エラーが発生しました。');
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                showError('通信エラーが発生しました。もう一度お試しください。');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = '送信';
                validateForm();
            });
        }
    });

    // 成功時のトースト通知を表示する関数
    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.remove('translate-x-full');
        
        setTimeout(function() {
            toast.classList.add('translate-x-full');
        }, 3000);
    }

    // エラー時のアラートを表示する関数
    function showError(message) {
        alert('エラー: ' + message);
    }

    // ページ表示時にフォームを隠す（パスワード認証有効）
    feedbackForm.style.display = 'none';
    document.querySelector('h1').style.display = 'none';
    completeMessage.style.display = 'none';
    passwordModal.style.display = 'flex'; // パスワードモーダルを表示

    // パスワード認証処理
    passwordSubmit.addEventListener('click', function() {
        const pw = accessPassword.value;
        if (pw === 'maimai') {
            passwordModal.style.display = 'none';
            feedbackForm.style.display = 'block';
            document.querySelector('h1').style.display = 'block';
            passwordError.style.display = 'none'; // エラーメッセージを隠す
        } else {
            passwordError.style.display = 'block';
        }
    });
    // エンターキーでも送信
    accessPassword.addEventListener('keypress', function(e) {
        if (e.which === 13 || e.keyCode === 13) {
            passwordSubmit.click();
        }
    });
    
    // パスワード入力時にエラーメッセージを隠す
    accessPassword.addEventListener('input', function() {
        passwordError.style.display = 'none';
    });

    // 過去の投稿履歴を読み込んで表示する関数
    function loadPastReports() {
        fetch('read.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'ok' && data.data && data.data.length > 0) {
                let historyHtml = '<div class="mt-8 border-t pt-6">';
                historyHtml += '<h3 class="text-lg font-bold mb-4">過去の投稿履歴</h3>';
                historyHtml += '<div class="space-y-4 max-h-96 overflow-y-auto">';
                
                // 最新のものから順に表示（配列を逆順にする）
                const reversedData = data.data.slice().reverse();
                
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
                
                completeMessage.insertAdjacentHTML('beforeend', historyHtml);
                
                // トップボタンのイベント
                document.getElementById('backToTop').addEventListener('click', function() {
                    location.href = './index.html';
                });
            } else {
                // データがない場合もトップボタンを表示
                let buttonHtml = '<button id="backToTop" class="mt-6 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">トップ</button>';
                completeMessage.insertAdjacentHTML('beforeend', buttonHtml);
                document.getElementById('backToTop').addEventListener('click', function() {
                    location.href = './index.html';
                });
            }
        })
        .catch(error => {
            console.error('投稿履歴の読み込みに失敗しました:', error);
            // エラーでもトップボタンを表示
            let buttonHtml = '<button id="backToTop" class="mt-6 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">トップ</button>';
            completeMessage.insertAdjacentHTML('beforeend', buttonHtml);
            document.getElementById('backToTop').addEventListener('click', function() {
                location.href = './index.html';
            });
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