"""
Configuración del sistema: valores editables desde la pantalla de
Usuarios, sin tener que tocar código ni el .env. Guardada como
clave/valor para poder agregar más ajustes en el futuro sin crear
una tabla nueva cada vez.
"""

from sqlalchemy import Column, Integer, String, Text
from database.database import Base


class Configuracion(Base):
    __tablename__ = "configuracion"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(50), unique=True, nullable=False, index=True)
    # Text (no String(200)) porque también guarda el asunto y el cuerpo
    # de los correos automáticos, más largos que un simple número.
    valor = Column(Text, nullable=False)
