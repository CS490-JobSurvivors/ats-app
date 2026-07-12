# Application Tracking System Web App (ATS)

## Live URLs
### Backend API: `https://api.jobsurvivors.tech`
### Frontend: `https://www.jobsurvivors.tech` (WIP)

## Tech Stack
- Frontend: React + TypeScript
- Backend: Python, FastAPI, Pydantic
- Auth: Supabase Auth with JWT verification in FastAPI
- Database: Supabase PostgreSQL
- ORM: SQLAlchemy
- AI Integration: Claude Sonnet 4.6
- Deployment: AWS

## Deployment
### Backend
- Docker: Containerized FastAPI app
- AWS ECR: Stores Docker Image
- AWS ECS Fargate: runs the container (serverless)
- AWS ALB: load balancer, handles HTTPS termination and keeps CI/CD stable on each build pass
- AWS Secrets Manager: Injects environment variables at runtime
- AWS ACM: provides SSL certificate for `api.jobsurvivors.tech`
- CloudWatch: logs for containers

### Frontend
- WIP

## Structure
- `frontend/` - React + TypeScript
- `backend/` - FastAPI, business logic, and DB access (see `backend/README.md` for details)
- `docs/context` - Context files for AI Assisted Coding

## Backend Setup (terminal)

### Terminal
```bash
    cd backend
    python -m venv .venv

    #Windows
    .venv\Scripts\activate

    pip install -r requirements.txt

    uvicorn app.main:app --reload
```

### Docker
Have docker desktop installed and running
```bash
    #Build the docker image
    docker build -t ats-backend ./backend

    #Run with local environment variables
    docker run -p 8000:8000 --env-file backend/.env ats-backend


```
Backend available at: `http://localhost:8000`
Swagger docs: `http://localhost:8000/docs`

## Linting, Formatting, and Tests
### Frontend:
```bash
# Ensure you're in the proper directory and install dependencies
cd frontend
npm install

# Linting
npm run lint

# Format
npm run format

# Test
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
2. `backend/.env.example`

## backend/.env.example
```
    SUPABASE_URL=
    SUPABASE_JWKS_URL=
    ANTHROPIC_API_KEY=
    DATABASE_URL=
    ALLOWED_ORIGINS=
```
## frontend/.env.example
```
    REACT_APP_API_URL=http://localhost:8000
    REACT_APP_SUPABASE_URL=
    REACT_APP_SUPABASE_PUBLISHABLE_KEY=
```

## Database Migrations

Migration files live in `backend/migrations/`. See [`backend/migrations/README.md`](backend/migrations/README.md) for the full migration strategy and rollback plan.

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
1. Secrets are stored using AWS Secrets Manager
