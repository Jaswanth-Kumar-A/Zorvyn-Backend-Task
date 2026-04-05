# Finance Dashboard Backend

A production-ready backend API for a Finance Dashboard built with FastAPI, MySQL, SQLAlchemy ORM, and JWT-based authentication.

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
- **Database:** MySQL
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

### 5) Ensure MySQL database exists

Create database in MySQL (example):
```sql
CREATE DATABASE finance_dashboard;
```

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
| `MYSQL_HOST` | MySQL host | `localhost` |
| `MYSQL_PORT` | MySQL port | `3306` |
| `MYSQL_USER` | MySQL username | `root` |
| `MYSQL_PASSWORD` | MySQL password | `your_password` |
| `MYSQL_DATABASE` | Target database name | `finance_dashboard` |
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
