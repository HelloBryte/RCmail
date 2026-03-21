const STORAGE_EMAIL_KEY = 'rcmail_user_email';
const STORAGE_TOKEN_KEY = 'rcmail_auth_token';
const API_BASE = getApiBase();

const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const clearBtn = document.getElementById('clear-history-btn');
const emailInput = document.getElementById('history-email');
const loadBtn = document.getElementById('load-history-btn');
const historyStatus = document.getElementById('history-status');

const auth = bootstrapAuth();

loadBtn?.addEventListener('click', async () => {
    await loadRecords();
});

clearBtn?.addEventListener('click', async () => {
    if (!auth) {
        showStatus('登录状态已失效，请重新登录。', 'error');
        toAuthPage();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/mails`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${auth.token}`
            }
        });
        if (response.status === 401) {
            clearAuth();
            toAuthPage();
            return;
        }
        if (!response.ok) throw new Error('clear failed');

        render([]);
        showStatus('已清空该邮箱下的历史记录。', 'success');
    } catch {
        showStatus('清空失败，请确认后端服务已启动。', 'error');
    }
});

if (auth) {
    loadRecords();
}

function render(records) {
    historyList.innerHTML = '';

    if (!records.length) {
        historyEmpty.classList.remove('hidden');
        historyList.classList.add('hidden');
        return;
    }

    historyEmpty.classList.add('hidden');
    historyList.classList.remove('hidden');

    records.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'bg-white border border-gray-200 rounded-2xl p-5 shadow-sm';
        card.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                    <h2 class="text-lg font-semibold text-gray-800">${escapeHtml(item.typeLabel || '未命名模板')}</h2>
                    <p class="text-xs text-gray-500">${formatDate(item.createdAt)}</p>
                </div>
                <span class="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded">${escapeHtml(item.recipient || '-')}</span>
            </div>
            <p class="text-sm text-gray-600 mb-3"><strong>目的：</strong>${escapeHtml(item.purpose || '-')}</p>
            <details class="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-3 mb-2">
                <summary class="cursor-pointer font-medium">查看中文邮件</summary>
                <pre class="whitespace-pre-wrap mt-3 leading-7">${escapeHtml(item.cn || '')}</pre>
            </details>
            <details class="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <summary class="cursor-pointer font-medium">查看俄语邮件</summary>
                <pre class="whitespace-pre-wrap mt-3 leading-7">${escapeHtml(item.ru || '')}</pre>
            </details>
        `;
        historyList.appendChild(card);
    });
}

async function loadRecords() {
    if (!auth) {
        showStatus('登录状态已失效，请重新登录。', 'error');
        toAuthPage();
        return;
    }

    loadBtn.disabled = true;
    loadBtn.classList.add('opacity-60', 'cursor-not-allowed');

    try {
        const response = await fetch(`${API_BASE}/mails`, {
            headers: {
                Authorization: `Bearer ${auth.token}`
            }
        });
        if (response.status === 401) {
            clearAuth();
            toAuthPage();
            return;
        }
        if (!response.ok) throw new Error('load failed');

        const payload = await response.json();
        const records = Array.isArray(payload.data) ? payload.data : [];

        render(records);
        showStatus(`已加载 ${records.length} 条记录。`, 'success');
    } catch {
        showStatus('加载失败，请确认后端服务已启动。', 'error');
    } finally {
        loadBtn.disabled = false;
        loadBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    }
}

function bootstrapAuth() {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const email = localStorage.getItem(STORAGE_EMAIL_KEY);

    if (!token || !email) {
        toAuthPage();
        return null;
    }

    emailInput.value = email;
    return { token, email };
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function showStatus(text, type) {
    historyStatus.textContent = text;
    historyStatus.classList.remove('hidden', 'text-red-600', 'text-green-700');
    historyStatus.classList.add(type === 'error' ? 'text-red-600' : 'text-green-700');
}

function getApiBase() {
    if (window.location.protocol === 'file:') {
        return 'http://localhost:3000/api';
    }
    return `${window.location.origin}/api`;
}

function toAuthPage() {
    window.location.href = 'auth.html';
}

function clearAuth() {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_EMAIL_KEY);
}
