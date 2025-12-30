from settings import settings as env
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

DATABASE_URL = 'postgresql+psycopg://maxdu:Tinatina22@localhost:5432/mydb'

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True
)

AsyncSession = async_sessionmaker(
    bind=engine,
    expire_on_commit=False
)

