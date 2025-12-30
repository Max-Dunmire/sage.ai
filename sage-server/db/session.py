from utils.settings import settings as env
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

DATABASE_URL = 'postgresql+asyncpg://maxdu:Tinatina22@localhost:5432/mydb'

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False
)

