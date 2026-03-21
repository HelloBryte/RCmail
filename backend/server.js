require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { readStore, writeStore } = require('./store');

const app = express();
const PORT = Number(process.env.PORT || 3000);
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
}
const JWT_SECRET = String(process.env.JWT_SECRET);
const OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY || '');
const OPENROUTER_MODEL = String(process.env.OPENROUTER_MODEL || 'stepfun/step-3.5-flash:free');
const OPENROUTER_BASE_URL = String(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1');
const CORS_ORIGIN = String(process.env.CORS_ORIGIN || '*');

const corsOriginList = CORS_ORIGIN.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
const allowAllOrigins = corsOriginList.includes('*');

app.use(
    cors({
        origin(origin, callback) {
            if (allowAllOrigins || !origin || corsOriginList.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error('CORS blocked'));
        }
    })
);
app.use(express.json({ limit: '1mb' }));
app.use(
    '/api',
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: Number(process.env.RATE_LIMIT_MAX || 180)
    })
);

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, message: 'RCMailAI backend is running' });
});

app.post('/api/auth/register', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email' });
    }
    if (!isValidPassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 6 chars' });
    }

    const store = await readStore();
    const existing = store.users.find((user) => user.email === email);

    if (existing && existing.passwordHash) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (!existing) {
        store.users.unshift({
            id: createId(),
            email,
            passwordHash,
            createdAt: new Date().toISOString()
        });
    } else {
        existing.passwordHash = passwordHash;
    }

    await writeStore(store);

    const token = signToken(email);
    return res.status(201).json({ ok: true, token, email });
});

app.post('/api/auth/login', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!isValidEmail(email) || !password) {
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    const store = await readStore();
    const user = store.users.find((item) => item.email === email);
    if (!user?.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatched = await bcrypt.compare(password, user.passwordHash);
    if (!isMatched) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(email);
    return res.json({ ok: true, token, email });
});

app.post('/api/generate', authenticateToken, async (req, res) => {
    const type = String(req.body?.type || '').trim();
    const typeLabel = String(req.body?.typeLabel || '').trim();
    const recipient = String(req.body?.recipient || '').trim();
    const purpose = String(req.body?.purpose || '').trim();
    const keyPoints = String(req.body?.keyPoints || '').trim();
    const tone = String(req.body?.tone || 'professional').trim();

    if (!type || !recipient || !purpose) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const generated = await generateBusinessMail({
            typeLabel: typeLabel || '商务沟通',
            recipient,
            purpose,
            keyPoints,
            tone
        });

        return res.json({
            ok: true,
            draft: {
                id: createId(),
                type,
                typeLabel: typeLabel || '商务沟通',
                recipient,
                purpose,
                cn: generated.cn,
                ru: generated.ru,
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        return res.status(502).json({
            error: `LLM generation failed: ${error.message || 'Unknown error'}`
        });
    }
});

app.post('/api/mails', authenticateToken, async (req, res) => {
    const email = req.userEmail;
    const type = String(req.body?.type || '').trim();
    const typeLabel = String(req.body?.typeLabel || '').trim();
    const recipient = String(req.body?.recipient || '').trim();
    const purpose = String(req.body?.purpose || '').trim();
    const cn = String(req.body?.cn || '').trim();
    const ru = String(req.body?.ru || '').trim();

    if (!type || !recipient || !purpose || !cn) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const store = await readStore();

    const existsUser = store.users.some((user) => user.email === email);
    if (!existsUser) {
        store.users.unshift({
            id: createId(),
            email,
            passwordHash: '',
            createdAt: new Date().toISOString()
        });
    }

    const record = {
        id: createId(),
        email,
        type,
        typeLabel,
        recipient,
        purpose,
        cn,
        ru,
        createdAt: new Date().toISOString()
    };

    store.mails.unshift(record);
    store.mails = store.mails.slice(0, 1000);

    await writeStore(store);

    return res.status(201).json({ ok: true, record });
});

app.get('/api/mails', authenticateToken, async (req, res) => {
    const email = req.userEmail;

    const store = await readStore();
    const data = store.mails.filter((item) => item.email === email);

    return res.json({ ok: true, data });
});

app.delete('/api/mails', authenticateToken, async (req, res) => {
    const email = req.userEmail;

    const store = await readStore();
    store.mails = store.mails.filter((item) => item.email !== email);
    await writeStore(store);

    return res.json({ ok: true });
});

app.listen(PORT, () => {
    console.log(`RCMailAI backend listening on http://localhost:${PORT}`);
});

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 6;
}

function createId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function signToken(email) {
    return jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
}

function authenticateToken(req, res, next) {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const email = normalizeEmail(payload?.email);
        if (!isValidEmail(email)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        req.userEmail = email;
        next();
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

async function generateBusinessMail(input) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is missing');
    }

    const prompt = [
        `邮件类型：${input.typeLabel}`,
        `收件方：${input.recipient}`,
        `沟通目的：${input.purpose}`,
        `补充要点：${input.keyPoints || '无'}`,
        `语气：${input.tone}`
    ].join('\n');

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.APP_SITE_URL || 'https://rcaimail.com',
            'X-Title': 'RCMailAI'
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            temperature: 0.4,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content:
                        '你是中俄商务邮件专家。根据中文需求生成得体、礼貌、结构清晰的俄语商务邮件，并输出 JSON：{"cn":"中文版本","ru":"俄语版本"}。不要输出 markdown，不要输出 JSON 以外内容。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    });

    if (!response.ok) {
        const raw = await response.text();
        throw new Error(`OpenRouter ${response.status}: ${raw.slice(0, 240)}`);
    }

    const payload = await response.json();
    const content = String(payload?.choices?.[0]?.message?.content || '');
    const parsed = parseJsonContent(content);

    const ru = String(parsed?.ru || '').trim();
    const cn = String(parsed?.cn || '').trim();

    if (!ru) {
        throw new Error('Model returned empty Russian content');
    }

    return {
        cn: cn || `主题：${input.typeLabel}\n\n尊敬的 ${input.recipient}：\n\n${input.purpose}\n${input.keyPoints ? `补充：${input.keyPoints}` : ''}\n\n此致\n敬礼`,
        ru
    };
}

function parseJsonContent(content) {
    if (!content) return {};

    const cleaned = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            return {};
        }

        try {
            return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
            return {};
        }
    }
}
