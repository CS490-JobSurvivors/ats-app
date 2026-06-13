# Application Tracking System Web App (ATS)

## Tech Stack
- Frontend: React + TypeScript
- Backend: Python + FastAPI 
- Database: PostgreSQL + SQLAlchemy ORM
- AI: Ollama
- Deployment: AWS

## Structure
- `frontend/` - React + TypeScript
- `backend/` - FastAPI, business logic, and DB access
- `docs/context` - Context files for AI Assisted Coding

## Run Commands
- Will be specified once project dependencies are finalized

## Tests
### Frontend:
```bash
# Frontend tests
npm test
```

### Backend:
```bash
# Ensure you're in the proper directory and install dependencies
cd ats-app/backend
pip install -r requirements.txt

# Backend Tests
pytest
```

## Environment Variables
### Local/Dev
1. Never commit secrets to .env.example
2. Copy contents of `.env.example` to local `.env`
3. Replace placeholder values with local development credentials
4. Update .gitignore as project scope grows

### CI/CD
1. Secrets are managed using GitHub Secrets.

### Prod (AWS deployment)
1. Secrets are stored using AWS Secrets Manager or AWS env (TBD)
