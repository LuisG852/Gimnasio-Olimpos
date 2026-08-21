"""
Modelo de datos: Socio.
Representa la tabla 'socios' en PostgreSQL.
"""

from sqlalchemy import Column, Integer, String, Date, Boolean, Numeric
from sqlalchemy.orm import relationship
from database.database import Base


class Socio(Base):
    __tablename__ = "socios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    telefono = Column(String(20), nullable=False, unique=True)
    correo = Column(String(150), nullable=True)
    fecha_inscripcion = Column(Date, nullable=False)
    fecha_nacimiento = Column(Date, nullable=True)
    tipo_membresia = Column(String(20), nullable=False, default="Mensual")
    precio = Column(Numeric(10, 2), nullable=False, default=0)
    fecha_vencimiento = Column(Date, nullable=False)
    activo = Column(Boolean, default=True)

    # Guarda el valor de fecha_vencimiento para el que ya se mandó el
    # recordatorio por correo, así no se manda dos veces el mismo aviso.
    # Cuando el socio renueva y fecha_vencimiento cambia, se vuelve a poder enviar.
    recordatorio_correo_enviado = Column(Date, nullable=True)

    # cascade="all, delete-orphan": al borrar un socio, SQLAlchemy borra
    # también sus mediciones en vez de intentar dejarlas con socio_id=NULL
    # (lo cual fallaría porque esa columna es NOT NULL).
    # passive_deletes=True: no descarga las mediciones a memoria para
    # borrarlas una por una; deja que lo haga la base de datos con el
    # ON DELETE CASCADE ya definido en la foreign key. Más rápido y
    # funciona igual aunque se borre por fuera del ORM.
    mediciones = relationship(
        "Medicion",
        back_populates="socio",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
