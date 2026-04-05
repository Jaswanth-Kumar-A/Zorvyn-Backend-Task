# Finance Dashboard Backend

A production-ready backend API for a Finance Dashboard built with FastAPI, SQLAlchemy ORM, and JWT-based authentication.

## Project Overview

This service provides:
- User authentication with role-based access (`viewer`, `analyst`, `admin`)
- Transaction management with soft-delete support
- Financial dashboard analytics (summary, category totals, monthly trends, recent activity)
- Global API error handling for common HTTP and validation failures

The API is designed for frontend dashboards or internal finance tools that require secure access, clear role boundaries, and queryable financial records.

## Tech Stack

- **Framework:** FastAPI
- **Language:** Python 3.10+
- **Database:** SQLite (default) or MySQL
- **ORM:** SQLAlchemy
- **Authentication:** JWT (`python-jose`)
- **Password Hashing:** Passlib (`bcrypt`)
- **Configuration:** `python-dotenv` + environment variables
- **ASGI Server:** Uvicorn

## Project Structure

```text
.
|-- app/
|   |-- core/
|   |   |-- config.py
|   |   |-- dependencies.py
|   |   `-- security.py
|   |-- db/
|   |   `-- database.py
|   |-- models/
|   |   |-- base.py
|   |   |-- user.py
|   |   `-- transaction.py
|   |-- routers/
|   |   |-- auth.py
|   |   |-- transactions.py
|   |   `-- dashboard.py
|   `-- schemas/
|       |-- auth.py
|       |-- transaction.py
|       `-- dashboard.py
|-- .env
|-- .env.example
|-- main.py
|-- requirements.txt
`-- README.md
```

## Setup Instructions

### 1) Clone and open project

```bash
git clone <your-repo-url>
cd <your-project-folder>
```

### 2) Create and activate virtual environment

Windows (PowerShell):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:
```bash
python -m venv .venv
source .venv/bin/activate
```

### 3) Install dependencies

```bash
pip install -r requirements.txt
```

### 4) Configure environment variables

Copy `.env.example` to `.env`, then set real credentials/secrets.

### 5) Choose a database

By default, this project uses a persistent SQLite database file:
```env
DATABASE_URL=sqlite:///./finance_dashboard.db
```

If you want MySQL instead, clear `DATABASE_URL` and provide MySQL credentials in `.env`.

### 6) Run the API

```bash
uvicorn main:app --reload
```

### 7) Open API docs

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Environment Variables (.env)

Required variables:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Full SQLAlchemy database URL (recommended) | `sqlite:///./finance_dashboard.db` |
| `MYSQL_HOST` | MySQL host (used when `DATABASE_URL` is empty) | `localhost` |
| `MYSQL_PORT` | MySQL port (used when `DATABASE_URL` is empty) | `3306` |
| `MYSQL_USER` | MySQL username (used when `DATABASE_URL` is empty) | `root` |
| `MYSQL_PASSWORD` | MySQL password (used when `DATABASE_URL` is empty) | `your_password` |
| `MYSQL_DATABASE` | Target database name (used when `DATABASE_URL` is empty) | `finance_dashboard` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000,http://127.0.0.1:3000` |
| `JWT_SECRET_KEY` | JWT signing secret (use strong value) | `replace_with_strong_secret` |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiry in minutes | `60` |

## Authentication

- Register via `POST /auth/register`
- Login via `POST /auth/login` to receive a bearer token
- Send token on protected routes:

```http
Authorization: Bearer <access_token>
```

## API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/` | Health check | Public |
| `POST` | `/auth/register` | Register user and return token | Public |
| `POST` | `/auth/login` | Login and return token | Public |
| `GET` | `/auth/admin-analyst-only` | Example restricted endpoint | `admin`, `analyst` |
| `POST` | `/transactions/` | Create transaction | `admin` |
| `GET` | `/transactions/` | List transactions (supports filters + pagination) | `viewer`, `analyst`, `admin` |
| `GET` | `/transactions/{transaction_id}` | Get one transaction | `viewer`, `analyst`, `admin` |
| `PUT` | `/transactions/{transaction_id}` | Update transaction | `admin` |
| `DELETE` | `/transactions/{transaction_id}` | Soft delete transaction | `admin` |
| `GET` | `/dashboard/summary` | Total income, expenses, net balance | `viewer`, `analyst`, `admin` |
| `GET` | `/dashboard/by-category` | Totals grouped by category | `viewer`, `analyst`, `admin` |
| `GET` | `/dashboard/monthly-trend` | Income/expense totals grouped by month | `viewer`, `analyst`, `admin` |
| `GET` | `/dashboard/recent` | Last 10 non-deleted transactions | `viewer`, `analyst`, `admin` |

### Transaction List Filters

`GET /transactions/` supports:
- `start_date` (YYYY-MM-DD)
- `end_date` (YYYY-MM-DD)
- `category` (exact match)
- `type` (`income` or `expense`)
- `skip` (default `0`)
- `limit` (default `20`, max `100`)

Example:
```http
GET /transactions/?start_date=2026-01-01&end_date=2026-12-31&category=Salary&type=income&skip=0&limit=20
```

## Role Permissions Matrix

| Feature | Viewer | Analyst | Admin |
|---|---|---|---|
| View transactions | Yes | Yes | Yes |
| Create transaction | No | No | Yes |
| Update transaction | No | No | Yes |
| Delete transaction (soft delete) | No | No | Yes |
| View dashboard summary | Yes | Yes | Yes |
| View dashboard by category | Yes | Yes | Yes |
| View dashboard monthly trend | Yes | Yes | Yes |
| View recent transactions | Yes | Yes | Yes |
| Access `/auth/admin-analyst-only` | No | Yes | Yes |

## Error Handling

Global exception handlers include:
- `404` resource not found
- `422` validation errors with normalized field + message output
- `401` unauthorized
- `403` forbidden
- `500` internal server errors with logging

## Assumptions Made

1. **Schema creation strategy:** Tables are auto-created at startup using `Base.metadata.create_all(...)`; migrations (Alembic) are not yet configured.
2. **Token payload:** JWT `sub` stores the user ID as a string.
3. **Soft delete policy:** Deleted transactions are not removed from DB; they are marked with `is_deleted = true` and excluded from reads.
4. **Category filtering:** Category filter is exact-match, case-sensitive behavior depends on MySQL collation.
5. **Monetary precision:** Amount uses SQL `Numeric(12,2)` and is exposed as `Decimal` in API schemas.
6. **Open registration:** `POST /auth/register` is currently public and allows setting role in payload.
7. **Timezone behavior:** Transaction `date` is stored as date-only; `created_at` uses DB server time.
8. **Monthly grouping:** Monthly trend uses MySQL `DATE_FORMAT(..., "%Y-%m")`.

## Suggested Next Improvements

- Add Alembic migrations for controlled schema evolution
- Add refresh tokens and token revocation strategy
- Restrict role assignment during registration (admin-only role elevation)
- Add unit/integration tests for auth, permissions, and analytics endpoints
- Add Docker support for local dev parity

## Deployment (Render)

This repository is now ready to deploy with [render.yaml](render.yaml).

### 1) Push code to GitHub

Render deploys from your Git repository, so commit and push your latest changes.

### 2) Create Blueprint on Render

1. Open Render dashboard.
2. Choose **New +** -> **Blueprint**.
3. Select this repository.
4. Render will detect `render.yaml` and propose:
	 - `zorvyn-finance-backend` (FastAPI web service)
	 - `zorvyn-finance-frontend` (Vite static site)

### 3) Configure backend environment variables

Set these in Render for `zorvyn-finance-backend`:

- `DATABASE_URL`: Use a managed DB URL for production persistence.
	- Example MySQL URL: `mysql+pymysql://user:password@host:3306/finance_dashboard`
- `JWT_SECRET_KEY`: Use a long random secret.
- `CORS_ORIGINS`: Set to your frontend URL.
	- Example: `https://zorvyn-finance-frontend.onrender.com`
- `DEMO_AUTH_BYPASS=false`

### 4) Configure frontend environment variable

Set this in Render for `zorvyn-finance-frontend`:

- `VITE_API_BASE_URL`: Backend public URL.
	- Example: `https://zorvyn-finance-backend.onrender.com`

### 5) Trigger deploy

After variables are saved, deploy both services. Visit:

- Frontend: `https://<your-frontend>.onrender.com`
- Backend docs: `https://<your-backend>.onrender.com/docs`

### Important persistence note

Using SQLite on most cloud runtimes is not durable across rebuilds/restarts.
For reliable persistence in production, use a managed MySQL/PostgreSQL database and set `DATABASE_URL` accordingly.

## Single Link Deployment (Vercel Frontend + Render Backend)

If you want one public app link, deploy the frontend to Vercel and keep the backend on Render.
The frontend then calls `/api`, and Vercel proxies that path to Render.

### What to set in Vercel

- Root directory: `frontend`
- Environment variable: `BACKEND_URL=https://zorvyn-backend-task-q5ig.onrender.com`

### What to set in Render

- Keep the backend service running on Render.
- If you want direct browser access to the backend too, add your Vercel URL to `CORS_ORIGINS`.

### Recommended Render CORS value

- `CORS_ORIGINS=https://zorvyn-backend-task-seven.vercel.app`

### Result

Your users open only the Vercel URL, and all API calls go through the same domain via `/api`.
