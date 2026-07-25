import os
import asyncio
import urllib.request
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import engine, Base
from auth import router as auth_router
from users import router as users_router
from events import router as events_router
from payments import router as payments_router
from webhooks import router as webhooks_router
from registration import router as registration_router

from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from limiter import limiter, _rate_limit_exceeded_handler

from cache import init_cache
from sweeper import cleanup_expired_registrations

app = FastAPI(title=settings.PROJECT_NAME)


async def keep_alive_ping():
    """
    Keep-Alive Task: Pings the backend service every 10 minutes (600 seconds)
    to prevent Render free tier from spinning down after 15 minutes of inactivity.
    """
    await asyncio.sleep(30)
    render_url = os.getenv("RENDER_EXTERNAL_URL") or "https://envision-2026.onrender.com"
    ping_url = f"{render_url.rstrip('/')}/ping"

    while True:
        try:
            def do_ping():
                req = urllib.request.Request(ping_url, headers={"User-Agent": "Render-KeepAlive/1.0"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    return resp.getcode()
            
            status_code = await asyncio.to_thread(do_ping)
            print(f"[Keep-Alive] Pinged {ping_url} -> Status {status_code}")
        except Exception as e:
            print(f"[Keep-Alive Notice] {e}")
        
        await asyncio.sleep(600)  # Ping every 10 minutes


@app.on_event("startup")
async def startup_event():
    # Auto-Migration: Ensure max_capacity column exists on events and legacy schemas are cleaned up
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # 1. Safely add max_capacity column to events if missing
            conn.execute(text("ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 100;"))
            
            # 2. Check if legacy teams table exists without team_id column
            teams_table_exists = conn.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams');"
            )).scalar()
            
            if teams_table_exists:
                team_id_col_exists = conn.execute(text(
                    "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_id');"
                )).scalar()
                
                if not team_id_col_exists:
                    print("[!] Auto-Cleanup: Dropping legacy tables lacking team_id...")
                    conn.execute(text("DROP TABLE IF EXISTS registrations CASCADE;"))
                    conn.execute(text("DROP TABLE IF EXISTS event_registrations CASCADE;"))
                    conn.execute(text("DROP TABLE IF EXISTS teams CASCADE;"))
                    conn.execute(text("DROP TABLE IF EXISTS participants CASCADE;"))
                    conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
                else:
                    # Ensure uix_team_event unique constraint exists on public.teams
                    conn.execute(text("""
                        DO $$ 
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint WHERE conname = 'uix_team_event'
                            ) THEN
                                ALTER TABLE public.teams ADD CONSTRAINT uix_team_event UNIQUE (team_name, event_name);
                            END IF;
                        END $$;
                    """))
            
            conn.commit()
            print("✅ Auto-migration check completed (teams uix_team_event & events max_capacity verified).")
    except Exception as migration_err:
        print(f"[!] Migration Check Notice: {migration_err}")

    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables (participants, teams, registrations) created/verified successfully!")
    except Exception as e:
        print(f"[!] Warning: Could not initialize DB tables on startup: {e}")

    await init_cache()
    asyncio.create_task(cleanup_expired_registrations())
    asyncio.create_task(keep_alive_ping())

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Configure Strict CORS Middleware (Supports localhost & production domains)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://envision26.rkmrc.org",
        "https://neon-gtr-showcase.vercel.app",
        "https://envision-2026-seven.vercel.app"
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|.*\.vercel\.app)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(events_router)
app.include_router(payments_router)
app.include_router(webhooks_router)
app.include_router(registration_router)

@app.get("/")
def root():
    return {"status": "online", "message": "Welcome to the Tech Fest API"}

@app.get("/ping")
def ping():
    return {"status": "awake", "message": "Keep-alive ping successful"}
