from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import engine, Base
from auth import router as auth_router
from users import router as users_router
from events import router as events_router
from payments import router as payments_router
from webhooks import router as webhooks_router

from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from limiter import limiter, _rate_limit_exceeded_handler

import asyncio
from cache import init_cache
from sweeper import cleanup_expired_registrations

app = FastAPI(title=settings.PROJECT_NAME)

@app.on_event("startup")
async def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[!] Warning: Could not initialize DB tables on startup: {e}")
    await init_cache()
    asyncio.create_task(cleanup_expired_registrations())

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

@app.get("/")
def root():
    return {"status": "online", "message": "Welcome to the Tech Fest API"}
