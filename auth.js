const STORAGE_EMAIL_KEY = 'rcmail_user_email';
const STORAGE_TOKEN_KEY = 'rcmail_auth_token';
const API_BASE = getApiBase();

const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const authStatus = document.getElementById('auth-status');
const logoutBtn = document.getElementById('logout-btn');

bootstrapKnownEmail();

registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = String(registerEmail.value || '').trim().toLowerCase();
    const password = String(registerPassword.value || '');

    if (!isValidEmail(email)) {
        showStatus('请输入有效邮箱。', 'error');
        return;
    }

    if (password.length < 6) {
        showStatus('密码至少 6 位。', 'error');
        return;
    }

    try {
        const result = await authRequest('/auth/register', { email, password });
        saveAuth(result?.email, result?.token);
        showStatus('注册成功，正在跳转到生成页。', 'success');
        setTimeout(() => {
            window.location.href = 'generate.html';
        }, 300);
    } catch (error) {
        showStatus(`注册失败：${error.message}`, 'error');
    }
});

loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = String(loginEmail.value || '').trim().toLowerCase();
    const password = String(loginPassword.value || '');

    if (!isValidEmail(email) || !password) {
        showStatus('请输入邮箱和密码。', 'error');
        return;
    }

    try {
        const result = await authRequest('/auth/login', { email, password });
        saveAuth(result?.email, result?.token);
        showStatus('登录成功，正在跳转到生成页。', 'success');
        setTimeout(() => {
            window.location.href = 'generate.html';
        }, 300);
    } catch (error) {
        showStatus(`登录失败：${error.message}`, 'error');
    }
});

logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_EMAIL_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    showStatus('已退出登录。', 'success');
});

async function authRequest(path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const payload = await safeJson(response);
    if (!response.ok) {
        throw new Error(payload?.error || '请求失败');
    }

    if (!payload?.token || !payload?.email) {
        throw new Error('响应缺少登录信息');
    }

    return payload;
}

function saveAuth(email, token) {
    localStorage.setItem(STORAGE_EMAIL_KEY, String(email || '').trim().toLowerCase());
    localStorage.setItem(STORAGE_TOKEN_KEY, String(token || ''));
}

function bootstrapKnownEmail() {
    const email = localStorage.getItem(STORAGE_EMAIL_KEY);
    if (!email) return;

    registerEmail.value = email;
    loginEmail.value = email;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showStatus(text, type) {
    authStatus.textContent = text;
    authStatus.classList.remove('hidden', 'text-red-600', 'text-green-700');
    authStatus.classList.add(type === 'error' ? 'text-red-600' : 'text-green-700');
}

function getApiBase() {
    if (window.location.protocol === 'file:') {
        return 'http://localhost:3000/api';
    }
    return `${window.location.origin}/api`;
}

async function safeJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}
