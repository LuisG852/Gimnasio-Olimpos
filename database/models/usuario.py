"""
Modelo de datos: Usuario.
Representa la tabla 'usuarios': quién puede entrar al sistema y con qué rol.
"""

from sqlalchemy import Column, Integer, String, Boolean, JSON
from database.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    usuario = Column(String(50), nullable=False, unique=True)
    password_hash = Column(String(200), nullable=False)
    es_admin = Column(Boolean, nullable=False, default=False)
    activo = Column(Boolean, nullable=False, default=True)

    # Solo aplica a usuarios que NO son admin (un admin siempre ve y
    # puede hacer todo, sin excepción). Guarda, por cada pestaña, si el
    # usuario la puede ver y qué acciones específicas puede hacer ahí
    # dentro. Ejemplo:
    # {"socios": {"activo": true, "acciones": {"crear": true, "eliminar": false, ...}}}
    permisos = Column(JSON, nullable=False, default=dict)
