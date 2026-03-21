const fs = require('fs/promises');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'store.db');
const LEGACY_STORE_PATH = path.join(DATA_DIR, 'store.json');

const EMPTY_STORE = {
    users: [],
    mails: []
};

let dbPromise;

async function getDb() {
    if (!dbPromise) {
        dbPromise = initDb();
    }

    return dbPromise;
}

async function initDb() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    await db.exec(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            passwordHash TEXT,
            createdAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS mails (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            type TEXT NOT NULL,
            typeLabel TEXT,
            recipient TEXT NOT NULL,
            purpose TEXT NOT NULL,
            cn TEXT NOT NULL,
            ru TEXT,
            createdAt TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_mails_email_createdAt
        ON mails (email, createdAt DESC);
    `);

    await ensureUsersPasswordHashColumn(db);

    await migrateLegacyJsonIfNeeded(db);

    return db;
}

async function migrateLegacyJsonIfNeeded(db) {
    const counts = await db.get(`
        SELECT
            (SELECT COUNT(1) FROM users) AS userCount,
            (SELECT COUNT(1) FROM mails) AS mailCount
    `);

    if ((counts?.userCount || 0) > 0 || (counts?.mailCount || 0) > 0) {
        return;
    }

    let raw = '';
    try {
        raw = await fs.readFile(LEGACY_STORE_PATH, 'utf8');
    } catch {
        return;
    }

    let parsed = EMPTY_STORE;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return;
    }

    const users = Array.isArray(parsed.users) ? parsed.users : [];
    const mails = Array.isArray(parsed.mails) ? parsed.mails : [];

    if (users.length === 0 && mails.length === 0) {
        return;
    }

    await db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
        for (const user of users) {
            await db.run(
                `INSERT OR IGNORE INTO users (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)`,
                String(user?.id || createId()),
                String(user?.email || '').trim().toLowerCase(),
                String(user?.passwordHash || ''),
                String(user?.createdAt || new Date().toISOString())
            );
        }

        for (const mail of mails) {
            await db.run(
                `
                INSERT OR IGNORE INTO mails
                (id, email, type, typeLabel, recipient, purpose, cn, ru, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                String(mail?.id || createId()),
                String(mail?.email || '').trim().toLowerCase(),
                String(mail?.type || ''),
                String(mail?.typeLabel || ''),
                String(mail?.recipient || ''),
                String(mail?.purpose || ''),
                String(mail?.cn || ''),
                String(mail?.ru || ''),
                String(mail?.createdAt || new Date().toISOString())
            );
        }

        await db.exec('COMMIT');
    } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
    }
}

async function readStore() {
    const db = await getDb();

    const users = await db.all(
        `SELECT id, email, passwordHash, createdAt FROM users ORDER BY createdAt DESC, rowid DESC`
    );
    const mails = await db.all(
        `
        SELECT id, email, type, typeLabel, recipient, purpose, cn, ru, createdAt
        FROM mails
        ORDER BY createdAt DESC, rowid DESC
        `
    );

    return { users, mails };
}

async function writeStore(nextStore) {
    const db = await getDb();

    const users = Array.isArray(nextStore?.users) ? nextStore.users : [];
    const mails = Array.isArray(nextStore?.mails) ? nextStore.mails : [];

    await db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
        await db.run(`DELETE FROM users`);
        await db.run(`DELETE FROM mails`);

        for (const user of users) {
            await db.run(
                `INSERT OR REPLACE INTO users (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)`,
                String(user?.id || createId()),
                String(user?.email || '').trim().toLowerCase(),
                String(user?.passwordHash || ''),
                String(user?.createdAt || new Date().toISOString())
            );
        }

        for (const mail of mails) {
            await db.run(
                `
                INSERT OR REPLACE INTO mails
                (id, email, type, typeLabel, recipient, purpose, cn, ru, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                String(mail?.id || createId()),
                String(mail?.email || '').trim().toLowerCase(),
                String(mail?.type || ''),
                String(mail?.typeLabel || ''),
                String(mail?.recipient || ''),
                String(mail?.purpose || ''),
                String(mail?.cn || ''),
                String(mail?.ru || ''),
                String(mail?.createdAt || new Date().toISOString())
            );
        }

        await db.exec('COMMIT');
    } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
    }
}

function createId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureUsersPasswordHashColumn(db) {
    const columns = await db.all(`PRAGMA table_info(users)`);
    const hasPasswordHash = columns.some((column) => column.name === 'passwordHash');
    if (hasPasswordHash) {
        return;
    }

    await db.exec(`ALTER TABLE users ADD COLUMN passwordHash TEXT`);
}

module.exports = {
    readStore,
    writeStore
};
