const TEMPLATE_LABELS = {
    exhibition: '展会邀请',
    cooperation: '合作洽谈',
    followup: '客户跟进',
    aftersale: '售后服务',
    payment: '催款提醒'
};

const STORAGE_EMAIL_KEY = 'rcmail_user_email';
const STORAGE_TOKEN_KEY = 'rcmail_auth_token';
const API_BASE = getApiBase();

const form = document.getElementById('mail-form');
const currentEmail = document.getElementById('current-email');
const templateType = document.getElementById('templateType');
const recipient = document.getElementById('recipient');
const purpose = document.getElementById('purpose');
const keyPoints = document.getElementById('keyPoints');
const tone = document.getElementById('tone');
const resultPanel = document.getElementById('result-panel');
const mailCn = document.getElementById('mail-cn');
const mailRu = document.getElementById('mail-ru');
const saveHistoryBtn = document.getElementById('save-history-btn');
const copyRuBtn = document.getElementById('copy-ru-btn');
const formStatus = document.getElementById('form-status');

let latestDraft = null;
const auth = bootstrapAuth();

bootstrapTemplateType();

form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!auth) {
        showStatus('登录状态已失效，请重新登录。', 'error');
        toAuthPage();
        return;
    }

    if (!recipient.value.trim() || !purpose.value.trim()) {
        showStatus('请先填写收件人与沟通目的。', 'error');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-60', 'cursor-not-allowed');

    try {
        const payload = {
            type: templateType.value,
            typeLabel: TEMPLATE_LABELS[templateType.value] || '商务沟通',
            recipient: recipient.value.trim(),
            purpose: purpose.value.trim(),
            keyPoints: keyPoints.value.trim(),
            tone: tone.value
        };

        const generated = await generateDraft(payload, auth.token);
        latestDraft = generated;
        mailCn.textContent = generated.cn || '';
        mailRu.textContent = generated.ru || '';
        resultPanel.classList.remove('hidden');
        showStatus('邮件已生成，可复制或保存到历史记录。', 'success');
    } catch (error) {
        showStatus(`生成失败：${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    }
});

saveHistoryBtn?.addEventListener('click', async () => {
    if (!latestDraft) return;

    if (!auth) {
        showStatus('登录状态已失效，请重新登录。', 'error');
        toAuthPage();
        return;
    }

    saveHistoryBtn.disabled = true;
    saveHistoryBtn.classList.add('opacity-60', 'cursor-not-allowed');

    try {
        await saveMail(latestDraft, auth.token);

        saveHistoryBtn.textContent = '已保存';
        showStatus('已保存到历史记录。', 'success');

        setTimeout(() => {
            saveHistoryBtn.textContent = '保存到历史记录';
        }, 1200);
    } catch (error) {
        showStatus(`保存失败：${error.message}`, 'error');
    } finally {
        saveHistoryBtn.disabled = false;
        saveHistoryBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    }
});

copyRuBtn?.addEventListener('click', async () => {
    if (!latestDraft?.ru) return;

    try {
        await navigator.clipboard.writeText(latestDraft.ru);
        showStatus('俄语邮件已复制。', 'success');
    } catch {
        showStatus('复制失败，请手动复制。', 'error');
    }
});

function bootstrapTemplateType() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    if (!type || !TEMPLATE_LABELS[type]) return;
    templateType.value = type;
}

async function generateDraft(payload, token) {
    const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (response.status === 401) {
        clearAuth();
        toAuthPage();
        throw new Error('登录已过期，请重新登录。');
    }

    if (!response.ok) {
        const payloadErr = await safeJson(response);
        throw new Error(payloadErr?.error || '生成接口不可用');
    }

    const result = await response.json();
    return result?.draft || null;
}

async function saveMail(payload, token) {
    const response = await fetch(`${API_BASE}/mails`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (response.status === 401) {
        clearAuth();
        toAuthPage();
        throw new Error('登录已过期，请重新登录。');
    }

    if (!response.ok) {
        const payloadErr = await safeJson(response);
        throw new Error(payloadErr?.error || '保存接口不可用');
    }
}

function showStatus(text, type) {
    if (!formStatus) return;
    formStatus.textContent = text;
    formStatus.classList.remove('hidden', 'text-red-600', 'text-green-700');
    formStatus.classList.add(type === 'error' ? 'text-red-600' : 'text-green-700');
}

window.addEventListener('error', () => {
    if (formStatus?.textContent) return;
    showStatus('页面发生错误，请刷新后重试。', 'error');
});

window.addEventListener('unhandledrejection', () => {
    if (formStatus?.textContent) return;
    showStatus('请求失败，请确认后端服务已启动。', 'error');
});

fetch(`${API_BASE}/health`)
    .then((response) => {
        if (!response.ok) throw new Error('health check failed');
        showStatus('后端连接正常。', 'success');
    })
    .catch(() => {
        showStatus('未连接到后端，请先执行 npm start。', 'error');
    });

function bootstrapAuth() {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const email = localStorage.getItem(STORAGE_EMAIL_KEY);

    if (!token || !email) {
        toAuthPage();
        return null;
    }

    currentEmail.textContent = email;
    return { token, email };
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

async function safeJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}
