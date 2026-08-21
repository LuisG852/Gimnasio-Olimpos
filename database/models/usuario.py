"""
Modelo de datos: Usuario.
Representa la tabla 'usuarios': quién puede entrar al sistema y con qué rol.
"""

from sqlalchemy import Column, Integer, String, Boolean
from database.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    usuario = Column(String(50), nullable=False, unique=True)
    password_hash = Column(String(200), nullable=False)
    es_admin = Column(Boolean, nullable=False, default=False)
    activo = Column(Boolean, nullable=False, default=True)
