from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Configure production-ready connection pool with PgBouncer compatibility
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True
    )
else:
    connect_args = {
        "connect_timeout": 10,
        "prepare_threshold": None  # Disables prepared statements in psycopg2 for Supabase PgBouncer
    }
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
