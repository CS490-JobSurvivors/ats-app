# Application Tracking System Web App (ATS)

## Tech Stack
- Frontend: React + TypeScript
- Backend: Python, FastAPI, Pydantic
- Auth: Supabase AUth with JWT verification in FastAPI
- Database: Supabase PostgreSQL
- ORM: SQLAlchemy
- AI: Ollama (planned for future sprint)
- Deployment: AWS (planned for future sprint)

## Structure
- `frontend/` - React + TypeScript
- `backend/` - FastAPI, business logic, and DB access (see `backend/README.md` for details)
- `docs/context` - Context files for AI Assisted Coding

## Backend Setup
```bash
    cd backend
    python -m venv .venv

    #Windows
    .venv\Scripts\activate

    pip install -r requirements.txt

    uvicorn app.main:app --reload
```
Backend available at: `http://127.0.0.1:8000`
Swagger docs: `http://127.0.0.1:8000/docs`

## Linting, Formatting, and Tests
### Frontend:
```bash
# Frontend tests
npm test
```

### Backend:
```bash
# Ensure you're in the proper directory and install dependencies
cd backend
pip install -r requirements.txt

# Linting
ruff check .
ruff check . --fix # auto fixes

# Format
ruff format .

# Run Backend Tests
pytest

# Run specific Test
pytest testing/test_health.py
```

## Environment Variables
### Ground Rules for Local/Dev:
1. Generally, frontend and backend has their own .env.example file
2. Copy contents of `.env.example` to local `.env` for `frontend/`, and `backend/app/`
3. Replace placeholder values with local development credentials
4. Update .gitignore as project scope grows

### .env.example locations:
1. `frontend/.env.example`
2. `backend/app/.env.example`

## backend/.env.example
```
    SUPABASE_URL=
    SUPABASE_JWKS_URL=
```
## frontend/.env.example
```
    REACT_APP_API_URL=http://localhost:8000
    REACT_APP_SUPABASE_URL=
    REACT_APP_SUPABASE_PUBLISHABLE_KEY=
```

## Authentication
1. Frontend authenticates using Supabase Auth.
2. Supabase Auth returns an access token.
3. Frontend sends the token in:
    ```
    Authorization: Bearer <access_token>
    ```
4. FastAPI verifies the JWT using Supabase JWKS.
5. Protected endpoints identify the authenticated user from the verified token
6. Where necessary, returning protected data

### CI/CD
1. Secrets are managed using GitHub Secrets.

### Prod (AWS deployment)
1. Secrets are stored using AWS Secrets Manager or AWS env (TBD)
