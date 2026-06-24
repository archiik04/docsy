import json
import logging
import hashlib
from typing import Any, Optional
# pyrefly: ignore [missing-import]
import redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize redis connection lazily/safely
_redis_client = None

def get_redis_client() -> Optional[redis.Redis]:
    global _redis_client
    if _redis_client is None:
        try:
            logger.info(f"Connecting to Redis at: {settings.REDIS_URL}")
            client = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2.0)
            # Ping to test connectivity
            client.ping()
            _redis_client = client
            logger.info("✓ Successfully connected to Redis")
        except Exception as e:
            logger.warning(f"⚠ Redis is unavailable, caching will be disabled. Error: {e}")
            _redis_client = None
    return _redis_client

def generate_cache_key(user_id: str, mode: str, query: str, document_ids: list[str]) -> str:
    """
    Generate a unique MD5 hash cache key from query params.
    """
    sorted_docs = sorted(document_ids or [])
    key_string = f"{user_id}:{mode}:{query}:{sorted_docs}"
    return hashlib.md5(key_string.encode("utf-8")).hexdigest()

def get_cached_retrieval(cache_key: str) -> Optional[list]:
    """
    Get cached search retrieval results.
    """
    client = get_redis_client()
    if not client:
        return None
    try:
        data = client.get(f"docsy:retrieval:{cache_key}")
        if data:
            logger.info(f"Cache HIT for key: {cache_key}")
            import uuid
            results = json.loads(data)
            for r in results:
                if "document_id" in r and r["document_id"]:
                    r["document_id"] = uuid.UUID(r["document_id"])
            return results
    except Exception as e:
        logger.warning(f"Failed to read from Redis cache: {e}")
    return None

def set_cached_retrieval(cache_key: str, results: list, ttl: int = 3600) -> None:
    """
    Cache retrieval results with a TTL.
    """
    client = get_redis_client()
    if not client:
        return
    try:
        # Normalize results to ensure JSON serialization (converting UUID to str, etc.)
        serialized_results = []
        for r in results:
            serialized_r = {**r}
            if "document_id" in serialized_r:
                serialized_r["document_id"] = str(serialized_r["document_id"])
            serialized_results.append(serialized_r)
            
        client.setex(
            f"docsy:retrieval:{cache_key}",
            ttl,
            json.dumps(serialized_results)
        )
        logger.info(f"Cache SET for key: {cache_key} with TTL {ttl}s")
    except Exception as e:
        logger.warning(f"Failed to write to Redis cache: {e}")
