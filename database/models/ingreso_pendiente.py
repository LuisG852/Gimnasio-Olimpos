"""
Modelo de datos: IngresoPendiente.
Cuando un pago (renovación, venta de producto, etc.) no se pudo
registrar en Caja porque el día ya estaba cerrado, se guarda aquí
para que quede un aviso visible hasta que alguien lo agregue a mano
desde "Registrar ingreso" y lo marque como resuelto.
"""

from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Boolean
from database.database import Base
from datetime import datetime


class IngresoPendiente(Base):
    __tablename__ = "ingresos_pendientes"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(200), nullable=False)
    monto = Column(Numeric(10, 2), nullable=False)
    fecha = Column(Date, nullable=False)          # el día al que correspondía el ingreso
    motivo = Column(String(200), nullable=True)     # por qué no se pudo sumar
    resuelto = Column(Boolean, default=False)
    fecha_creado = Column(DateTime, default=datetime.utcnow)
