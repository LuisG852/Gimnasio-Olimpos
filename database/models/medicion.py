"""
Modelo de datos: Medicion.
Representa la tabla 'mediciones' en PostgreSQL: un historial de
controles corporales por socio (uno por fecha), para seguir su progreso.
"""

from sqlalchemy import Column, Integer, String, Date, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from database.database import Base


class Medicion(Base):
    __tablename__ = "mediciones"

    id = Column(Integer, primary_key=True, index=True)
    socio_id = Column(Integer, ForeignKey("socios.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha = Column(Date, nullable=False)

    peso = Column(Numeric(5, 2), nullable=False)       # kg
    altura = Column(Numeric(4, 2), nullable=False)      # metros, ej: 1.75
    imc = Column(Numeric(4, 2), nullable=False)         # calculado al guardar

    pecho = Column(Numeric(5, 2), nullable=True)         # cm
    cintura = Column(Numeric(5, 2), nullable=True)
    cadera = Column(Numeric(5, 2), nullable=True)
    brazo_derecho = Column(Numeric(5, 2), nullable=True)
    brazo_izquierdo = Column(Numeric(5, 2), nullable=True)
    muslo_derecho = Column(Numeric(5, 2), nullable=True)
    muslo_izquierdo = Column(Numeric(5, 2), nullable=True)
    gemelo_derecho = Column(Numeric(5, 2), nullable=True)
    gemelo_izquierdo = Column(Numeric(5, 2), nullable=True)

    notas = Column(String(300), nullable=True)

    # Para poder recomendar un plan de entrenamiento con sentido
    objetivo = Column(String(30), nullable=True)     # bajar_peso | ganar_musculo | mantenimiento | fuerza
    nivel = Column(String(20), nullable=True)          # principiante | intermedio | avanzado
    split = Column(String(20), nullable=True)           # full_body | upper_lower | ppl | bro_split
    dias_por_semana = Column(Integer, nullable=True)    # 2 a 6
    enfasis = Column(String(30), nullable=True)          # gluteo_pierna | pecho_espalda | brazo | hombro | null

    socio = relationship("Socio", back_populates="mediciones")
