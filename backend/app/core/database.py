import ssl
import urllib.parse
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

db_url = settings.DATABASE_URL
connect_args = {}

if db_url:
    parsed = urllib.parse.urlparse(db_url)
    # Check if host is remote
    is_remote = False
    if parsed.hostname:
        is_remote = parsed.hostname not in {"localhost", "127.0.0.1", "postgres", "docsy_postgres"}
        
    # Strip all query parameters to prevent any asyncpg driver errors
    parsed = parsed._replace(query="")
    db_url = urllib.parse.urlunparse(parsed)
    
    # Enforce SSL context for remote database connections
    if is_remote:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_ctx

engine = create_async_engine(
    db_url,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session