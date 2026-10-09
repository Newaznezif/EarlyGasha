# EarlyGasha

EarlyGasha is a React application built with Vite, backed by a FastAPI service. The frontend uses React Router's `HashRouter`; API requests and the communication WebSocket are configured through one API base URL.

## Frontend

```powershell
cd frontend
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` in `frontend/.env.local` to the FastAPI origin when running against a separately hosted API. When running Vite locally without that variable, API requests default to `http://127.0.0.1:8000`.

### Vercel

Use the existing Vercel project; do not create another project. Configure its project settings as follows:

- Git repository: `Newaznezif/EarlyGasha`
- Production branch: `main`
- Root directory: `frontend`
- Framework preset: Vite
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL` set to the deployed FastAPI origin
- Environment variable: `VITE_GOOGLE_CLIENT_ID` set to the Google OAuth web client ID

`frontend/.env.example` contains a safe example value. Replace the example URL with the real API origin before production; do not use a Vite development server or localhost URL. No custom Vercel routing file is required for the current `HashRouter` routes.

Configure a Google OAuth client in Google Cloud as a Web application. Add the local frontend origin (for example, `http://localhost:5173`) and the deployed frontend origin to its authorized JavaScript origins. Set its client ID as `VITE_GOOGLE_CLIENT_ID` in Vercel and as `GOOGLE_CLIENT_ID` in the backend host. The values must match. Google sign-in creates new accounts with the institutional user role unless a role is selected on the registration page.

## Backend

The API entry point is `backend.main:app` and includes a `/health` endpoint. Run locally from the repository root:

```powershell
python -m pip install -r requirements.txt
uvicorn backend.main:app --reload
```

The backend defaults to a local SQLite file. Set `DATABASE_URL` to a persistent database in deployed environments; PostgreSQL URLs using `postgres://` or `postgresql://` are normalized for the installed Psycopg 3 driver. Set `CORS_ORIGINS` to a comma-separated list of exact frontend origins, for example `https://earlygasha.vercel.app`. Localhost origins remain allowed for development. Set `APP_ENV=production` and provide a unique `SECRET_KEY` of at least 32 characters in production. Do not use the development fallback key.

An initial administrator is created only when both `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are provided; the password must contain at least 12 characters. Configure these as private backend environment variables, and remove them after initial provisioning. The application does not expose default administrator credentials.

Vercel's static frontend deployment does not deploy this FastAPI service or its database. Deploy the backend separately on a Python/container host with persistent PostgreSQL, set its `DATABASE_URL` and `CORS_ORIGINS`, then set the Vercel `VITE_API_BASE_URL` to that service's public HTTPS origin and redeploy the frontend. SQLite on an ephemeral serverless filesystem is not suitable for persistent production data. The current API also includes WebSockets, so choose a backend host that supports long-lived WebSocket connections.

## Validation

From `frontend/`, run `npm ci`, `npm run build`, and `npm run lint`. From the repository root, run available Python tests after installing `requirements.txt`.
