# RCMailAI

This workspace includes a frontend + backend website for generating Russian business email drafts from Chinese key points.

## What Is Implemented

- `POST /api/auth/register`: register by email + password
- `POST /api/auth/login`: login by email + password
- `POST /api/generate`: generate CN/RU drafts with OpenRouter model
- `POST /api/mails`: save generated mail record (JWT required)
- `GET /api/mails`: query current user's history (JWT required)
- `DELETE /api/mails`: clear current user's history (JWT required)
- `GET /api/health`: health check

Data is stored in `backend/data/store.db` (SQLite).

If `backend/data/store.json` exists and the SQLite database is empty, backend startup will auto-migrate legacy JSON data into SQLite.

## Run

```bash
cp .env.example .env
# fill OPENROUTER_API_KEY and JWT_SECRET in .env
npm install
npm start
```

Backend runs at `http://localhost:3000`.

## Frontend Flow

1. Open `index.html`
2. Go to `auth.html` and register/login with email + password
3. Open `generate.html`, input Chinese points and generate draft
4. Click `保存到历史记录`
5. Open `history.html`, click `加载记录`

## Notes

- Generation is handled by backend OpenRouter API call.
- Default model: `stepfun/step-3.5-flash:free`.
