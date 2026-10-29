"""
Configuration de la persistance PostgreSQL avec SQLAlchemy 2.0 Asyncio.
"""

import os
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

raw_url = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://odace_app:odace_pass@localhost:5432/odace_testops"
)
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+asyncpg://"):
    raw_url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Normalisation pour asyncpg (retrait des paramètres incompatibles sslmode / channel_binding)
parsed = urlparse(raw_url)
query_params = parse_qs(parsed.query)
needs_ssl = "sslmode" in query_params or "ssl" in query_params

for bad_param in ["sslmode", "channel_binding"]:
    query_params.pop(bad_param, None)

new_query = urlencode(query_params, doseq=True)
DATABASE_URL = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))

connect_args = {}
if needs_ssl and not any(h in parsed.netloc for h in ["localhost", "127.0.0.1", "postgres"]):
    connect_args["ssl"] = "require"

engine = create_async_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_size=10,
    max_overflow=20,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dépendance FastAPI pour obtenir une session de base de données transactionnelle."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
