"""
Capa de conexión a la base de datos.
Este módulo NO conoce nada del backend ni del frontend.
Solo expone el engine, la sesión y la base declarativa de SQLAlchemy.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# La URL de conexión se lee de variable de entorno, nunca hardcodeada
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:1234@localhost:5432/gimnasio"
)

engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Generador de sesión de base de datos.
    El backend lo usa como dependencia (Depends(get_db) en FastAPI).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
