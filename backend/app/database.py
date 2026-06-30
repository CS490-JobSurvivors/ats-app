from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import DATABASE_URL

Base = declarative_base()
engine: Engine | None = None
SessionLocal: sessionmaker[Session] | None = None


def get_database_url() -> str:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL must be configured for Supabase Postgres storage")

    if DATABASE_URL.startswith("postgres://"):
        return DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)

    if DATABASE_URL.startswith("postgresql://"):
        return DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

    if DATABASE_URL.startswith("postgresql+psycopg://"):
        return DATABASE_URL

    raise RuntimeError("DATABASE_URL must use a Postgres connection string")


def get_session_local() -> sessionmaker[Session]:
    global engine, SessionLocal

    if SessionLocal is None:
        engine = create_engine(get_database_url())
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    return SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = get_session_local()()
    try:
        yield db
    finally:
        db.close()
