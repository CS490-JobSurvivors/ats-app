# Backend Architecture Flow
```mermaid 
graph LR
    subgraph Frontend
        UI[TypeScript + React]
        Fetch[Fetch API]
    end

    subgraph Backend
        FastAPI[FastAPI Routes]
        Validation[Pydantic]
        BusinessLogic[Services]
        SQLORM[SQLAlchemy]
    end

    subgraph Database
        DB[(Supabase PostgreSQL)]
    end

    UI --> Fetch
    Fetch --> |Request/Response| FastAPI
    FastAPI --> Validation
    Validation --> BusinessLogic
    BusinessLogic --> SQLORM
    SQLORM --> |CRUD| DB
```

## Backend File Structure (WIP)
- `app/models/`
    - SQLAlchemy ORM database models
- `app/routes/`
    - FastAPI endpoints `auth.py`, `health.py`, etc
- `app/schemas/`
    - Pydantic request and response schemas
- `app/services/`
    - Enforces business logic and application workflows
- `app/main.py`
    - FASTAPI entrypoint
- `app/database.py`
    - Database connection & SQLAlchemy session config
- `testing/`
    - Houses all backend tests
- `requirements.txt`
    - Backend dependencies