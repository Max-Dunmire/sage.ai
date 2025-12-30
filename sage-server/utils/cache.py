from redis.asyncio import Redis

cache: Redis | None = None

async def get_cache():
    global cache
    if cache is None:
        cache = Redis(
            host="localhost",
            port="6379",
            decode_responses=True
        )
    return cache

async def close_cache():
    global cache
    if cache is not None:
        await cache.aclose()
        cache = None