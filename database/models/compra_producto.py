"""
Modelo de datos: CompraProducto.
Cada fila es una compra/reabastecimiento de un producto del inventario
(sea de uso interno o de venta). Sirve para llevar el historial de a
qué precio se consiguió cada producto a lo largo del tiempo.
"""

from sqlalchemy import Column, Integer, Numeric, Date, ForeignKey
from database.database import Base
from datetime import date


class CompraProducto(Base):
    __tablename__ = "compras_productos"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    costo_unitario = Column(Numeric(10, 2), nullable=False)
    fecha = Column(Date, nullable=False, default=date.today)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
