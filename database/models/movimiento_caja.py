"""
Modelo de datos: MovimientoCaja.
Cada fila es una apertura de caja, un ingreso (pago de un socio) o un
gasto. El cierre del día se calcula sumando estas filas, no se guarda
un "cierre" aparte.
"""

from sqlalchemy import Column, Integer, String, Date, Numeric, ForeignKey
from database.database import Base


class MovimientoCaja(Base):
    __tablename__ = "movimientos_caja"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, index=True)
    tipo = Column(String(20), nullable=False)     # apertura | ingreso | gasto
    metodo = Column(String(20), nullable=True)     # efectivo | transferencia (solo ingresos)
    descripcion = Column(String(200), nullable=False)
    monto = Column(Numeric(10, 2), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
