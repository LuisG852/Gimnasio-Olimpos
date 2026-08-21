"""
Modelo de datos: Comprobante.
Cada fila es un recibo de pago generado. Guarda una copia de los
datos del socio al momento del pago (no una referencia en vivo),
para que el comprobante no cambie si después se edita al socio.
El 'id' funciona como número de folio consecutivo.
"""

from sqlalchemy import Column, Integer, String, Date, Numeric, ForeignKey
from database.database import Base


class Comprobante(Base):
    __tablename__ = "comprobantes"

    id = Column(Integer, primary_key=True, index=True)  # = número de folio
    socio_id = Column(Integer, ForeignKey("socios.id", ondelete="SET NULL"), nullable=True, index=True)

    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    fecha = Column(Date, nullable=False)
    tipo_membresia = Column(String(20), nullable=False)
    precio = Column(Numeric(10, 2), nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
