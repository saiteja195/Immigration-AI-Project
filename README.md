# Immigration AI

A web app to track US visa status (F-1, OPT, H-1B, H-4, H-4 EAD and more), turn goals into dated task checklists, and ask a chatbot that uses official US government sources.

**Stack:** FastAPI · MongoDB · React + TypeScript (Vite, Tailwind) · Docker Compose

## Run with Docker

```bash
cp backend/.env.example backend/.env   # then edit the values
docker compose up --build
```

App: http://localhost:8080 · API docs: http://localhost:8000/docs

## Run locally (no Docker)

```bash
# backend (needs a MongoDB on localhost:27017)
cd backend && pip install -r requirements-dev.txt && uvicorn app.main:app --reload

# frontend
cd frontend && npm install && npm run dev      # http://localhost:5173
```

## Demo data (development only)

```bash
docker compose exec api python -m scripts.seed_demo     # or: cd backend && python -m scripts.seed_demo
```

Creates `demo@example.com` / `demo-password-123` with a sample H-1B profile, a spouse, plans, tasks and two cases. Add `--reset` to recreate it. Never run this on a public server.

## Settings (`backend/.env`)

| Name | What it does |
|---|---|
| `MONGO_URL`, `MONGO_DB` | MongoDB connection |
| `JWT_SECRET` | Signs login cookies. Set a long random value |
| `ALLOW_SIGNUPS` | Set `false` to close public signups. The very first account can still be created |
| `COOKIE_SECURE` | Set `true` when served over HTTPS |
| `ENCRYPTION_KEY` | Turns on the document vault. Make one with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` and keep it safe. Without it, stored documents cannot be read |
| `ANTHROPIC_API_KEY` | Turns on the assistant. Chat is disabled without it |
| `ANTHROPIC_MODEL` | Model used by the assistant |

Login is locked for 15 minutes after 5 wrong passwords for the same email.

## Tests

```bash
cd backend && pytest
cd frontend && npm run typecheck && npm test
```

This app gives general information only. It is not legal advice.
