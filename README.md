# Application Tracking System Web App (ATS)

## Tech Stack
- Frontend: React + TypeScript
- Backend: Python + FastAPI
- Database: PostgreSQL (SQLAlchemy ORM)
- AI: Ollama
- Deployment: AWS

## Structure
- `frontend/` - React + TypeScript
- `backend/` - Python + FastAPI

## Run Commands
- Will be specified once project dependencies are finalized

## Tests
- npm test
- pytest

## Environment Variables
### Local/Dev
1. Never commit secrets to .env.example
2. Copy contents of .env.example to local .env
3. Replace placeholder values with local development credentials
4. Secrets for CI/CD are stored using GitHub Secrets for GitHub Actions integration

### Prod (AWS deployment)
1. Secrets are stored using AWS secrets manager or AWS env (TBD)
