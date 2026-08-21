"""
Modelo de datos: Ejercicio.
Biblioteca local de ejercicios (nombre, músculo, gif, instrucciones),
poblada una sola vez desde un repositorio público de gifs vía el
script seed_ejercicios.py — no se llama a internet en cada uso.
"""

from sqlalchemy import Column, Integer, String, Text, Boolean
from database.database import Base


class Ejercicio(Base):
    __tablename__ = "ejercicios"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    nombre = Column(String(150), nullable=False)
    musculo = Column(String(40), nullable=False, index=True)     # ej: biceps, pecho, cuadriceps
    equipo = Column(String(30), nullable=True)                    # ej: barbell, dumbbell, bodyweight
    instrucciones = Column(Text, nullable=True)
    gif_url = Column(String(500), nullable=False)
    activo = Column(Boolean, default=True)   # por si el admin quiere ocultar alguno sin borrarlo
