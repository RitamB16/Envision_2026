import os
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.backends.inmemory import InMemoryBackend
from redis import asyncio as aioredis
from config import settings


def get_redis_url() -> str:
    """
    Constructs TLS Redis connection string for Upstash or local fallback.
    """
    if hasattr(settings, "REDIS_URL") and settings.REDIS_URL:
        return settings.REDIS_URL

    upstash_url = getattr(settings, "UPSTASH_REDIS_REST_URL", None)
    upstash_token = getattr(settings, "UPSTASH_REDIS_REST_TOKEN", None)

    if upstash_url and upstash_token:
        host = upstash_url.replace("https://", "").replace("http://", "").strip("/")
        return f"rediss://default:{upstash_token}@{host}:6379?ssl_cert_reqs=none"

    return "redis://localhost:6379"


async def init_cache():
    """
    Initializes FastAPICache with Upstash TLS Redis backend.
    Falls back gracefully to InMemoryBackend if Redis server is unreachable.
    """
    redis_url = get_redis_url()
    try:
        redis = aioredis.from_url(redis_url, encoding="utf8", decode_responses=True)
        await redis.ping()
        FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
        print(f"✅ FastAPICache successfully initialized with Upstash Redis backend!")
    except Exception as e:
        print(f"Redis notice ({e}). Initializing FastAPICache with InMemoryBackend fallback.")
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
