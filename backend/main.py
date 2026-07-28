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
    Keep-Alive Task: Pings the backend service every 3 minutes (180 seconds)
    to prevent Render/cloud hosts from sleeping after inactivity.
    Ensures 24/7 uptime for instant 30-second email sweeping!
    """
    await asyncio.sleep(15)
    
    urls_to_ping = [
        os.getenv("RAILWAY_PUBLIC_DOMAIN"),
        os.getenv("RAILWAY_STATIC_URL"),
        os.getenv("BACKEND_URL")
    ]
    
    # Filter valid non-empty URLs
    valid_urls = []
    for u in urls_to_ping:
        if u:
            url_str = u if u.endswith("/ping") else f"{u.rstrip('/')}/ping"
            if url_str not in valid_urls and url_str.startswith("http"):
                valid_urls.append(url_str)

    if not valid_urls:
        valid_urls = ["http://127.0.0.1:8000/ping"]

    while True:
        for ping_url in valid_urls:
            try:
                def do_ping(target):
                    req = urllib.request.Request(target, headers={"User-Agent": "Envision26-KeepAlive/2.0"})
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        return resp.getcode()
                
                status_code = await asyncio.to_thread(do_ping, ping_url)
                print(f"[Keep-Alive Active] Pinged {ping_url} -> Status {status_code}")
                break  # Successful ping, break inner loop
            except Exception as e:
                print(f"[Keep-Alive Notice] Could not ping {ping_url}: {e}")

        await asyncio.sleep(180)  # Ping every 3 minutes (180 seconds) to guarantee 24/7 server uptime


@app.on_event("startup")
async def startup_event():
    def run_db_setup():
        # Auto-Migration: Ensure max_capacity column exists on events and legacy schemas are cleaned up
        try:
            from sqlalchemy import text
            with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                # 1. Safely add max_capacity column to events and email_sent to registrations if missing
                conn.execute(text("ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 100;"))
                conn.execute(text("ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;"))
                
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
                
                print("[OK] Auto-migration check completed (teams uix_team_event & events max_capacity verified).")
        except Exception as migration_err:
            print(f"[!] Migration Check Notice: {migration_err}")

        try:
            Base.metadata.create_all(bind=engine)
            print("[OK] Database tables (participants, teams, registrations) created/verified successfully!")
        except Exception as e:
            print(f"[!] Warning: Could not initialize DB tables on startup: {e}")

    # Run DB setup and cache init in background tasks so Uvicorn startup completes instantly
    asyncio.create_task(asyncio.to_thread(run_db_setup))
    asyncio.create_task(init_cache())
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
        "https://neon-gtr-showcase.vercel.app",
        "https://envision-2026-seven.vercel.app"
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|.*\.vercel\.app|.*\.up\.railway\.app|.*\.onrender\.com)(:[0-9]+)?",
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
@app.head("/")
async def root():
    return {"status": "online", "message": "Welcome to the Tech Fest API"}

@app.get("/ping")
@app.head("/ping")
async def ping():
    return {"status": "awake", "message": "Keep-alive ping successful"}
