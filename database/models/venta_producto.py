"""
Modelo de datos: VentaProducto.
Cada fila es una venta de un producto de inventario (tipo == "venta"),
hecha desde la pantalla de Caja. Queda ligada al movimiento de caja
correspondiente (el ingreso) a través de la fecha y el monto.
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from database.database import Base
from datetime import datetime


class VentaProducto(Base):
    __tablename__ = "ventas_productos"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="SET NULL"), nullable=True)
    nombre_producto = Column(String(150), nullable=False)  # copia por si el producto se borra después
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    metodo = Column(String(20), nullable=False)  # efectivo | transferencia
    fecha = Column(DateTime, default=datetime.utcnow)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
