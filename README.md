# AI Mock Interview

Practice interviews with AI-generated questions, answer feedback, resume-based sessions, and progress history.

The application includes a React frontend and an Express API. It supports general, resume-based, voice, camera, and coding interview flows, plus resume ATS analysis.

## Features

- Create interview sessions and practice technical questions.
- Get AI-generated questions and answer evaluations.
- Upload a resume to build a tailored interview or run an ATS-style scan.
- Practice with voice and camera interview experiences.
- Work through coding interview questions in an embedded editor.
- Review interview history, results, and leaderboard data.
- Sign in and register accounts; admin pages are role-protected.

## Technology

- **Frontend:** React, Vite, React Router, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **AI providers:** OpenRouter, Gemini, and DeepSeek

## Requirements

- Node.js compatible with Vite 8 (Node.js `20.19+` or `22.12+`)
- npm
- PostgreSQL with a compatible application schema
- An API key for at least one supported AI provider for AI features

> **Database note:** This repository does not currently include database migrations or a schema setup script. Create/configure a PostgreSQL database with the schema expected by the application before using database-backed features.

## Getting started

Clone the repository and install dependencies in each app directory:

```bash
git clone https://github.com/officialindranildahivele/AI-Mock-Interview.git
cd AI-Mock-Interview

cd backend
npm ci
cp .env.example .env
mkdir -p uploads
```

Edit `backend/.env` with your PostgreSQL connection details and AI provider key(s). Do not commit this file or put API keys in the frontend.

In one terminal, start the API:

```bash
cd backend
npm run dev
```

In another terminal, start the frontend:

```bash
cd backend/frontend
npm ci
npm run dev
```

Open the frontend URL printed by Vite (by default, [http://localhost:5173](http://localhost:5173)). The API listens on port `8000` by default; its status endpoint is [http://localhost:8000/api/status](http://localhost:8000/api/status).

## Environment configuration

Configure these values in `backend/.env`:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port; defaults to `8000` when unset. |
| `DB_USER` | PostgreSQL user. |
| `DB_HOST` | PostgreSQL host. |
| `DB_NAME` | PostgreSQL database name. |
| `DB_PASSWORD` | PostgreSQL password. |
| `DB_PORT` | PostgreSQL port; usually `5432`. |
| `JWT_SECRET` | Secret used to sign authentication tokens. Use a long, unique random value. |
| `OPENROUTER_API_KEY` | Optional OpenRouter API key. |
| `GEMINI_API_KEY` | Optional Google Gemini API key. |
| `DEEPSEEK_API_KEY` | Optional DeepSeek API key. |

At least one AI provider key is needed for AI-powered features. By default, the backend automatically tries configured providers. You can set `AI_PROVIDER` to `openrouter`, `gemini`, `deepseek`, or `auto`; purpose-specific settings and model overrides are also supported in `backend/services/aiProvider.js`.

The frontend currently targets `http://localhost:8000/api` directly. If you change the API host or port, update the API base URL in `backend/frontend/src/services/api.js` as well.

## Useful commands

Run these from the relevant directory:

| Directory | Command | Description |
| --- | --- | --- |
| `backend` | `npm run dev` | Start the API with automatic restarts. |
| `backend` | `npm start` | Start the API normally. |
| `backend/frontend` | `npm run dev` | Start the Vite development server. |
| `backend/frontend` | `npm run build` | Create a production frontend build. |
| `backend/frontend` | `npm run preview` | Preview the production frontend build. |
| `backend/frontend` | `npm run lint` | Run ESLint. |

## Project layout

```text
backend/
├── config/       # Database connection
├── controllers/  # API request handlers
├── middleware/   # Authentication and authorization
├── routes/       # Express API routes
├── services/     # AI, resume, transcription, and reporting logic
├── uploads/      # Local uploaded resumes (not tracked by Git)
└── frontend/     # React + Vite application
```

## Security and privacy

- Keep `backend/.env` private. The root `.gitignore` excludes environment files, dependencies, and uploaded files.
- Never publish API keys, database passwords, JWT secrets, or real user resumes.
- Resume uploads are stored locally in `backend/uploads/`; review your retention and access requirements before deploying.
- Voice and camera features may require browser permission and a secure context when deployed.

## Current limitations

- The frontend API URL is configured in source rather than through a Vite environment variable.
- Database schema creation and migrations are not included in this repository.
- This project has no documented deployment or automated test workflow yet.
