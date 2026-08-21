"""
Modelo de datos: Producto.
Representa la tabla 'productos' (inventario del gimnasio).
Un producto puede ser de uso interno (equipo, no se vende) o de venta
(suplementos, agua, etc.).
"""

from sqlalchemy import Column, Integer, String, Date, Boolean, Numeric
from database.database import Base
from datetime import date


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    categoria = Column(String(80), nullable=True)
    tipo = Column(String(20), nullable=False)   # "interno" | "venta"
    cantidad = Column(Integer, nullable=False, default=0)
    costo_unitario = Column(Numeric(10, 2), nullable=False)
    fecha_ingreso = Column(Date, nullable=False, default=date.today)
    activo = Column(Boolean, default=True)

    # Solo aplica si tipo == "interno" (para calcular depreciación)
    vida_util_meses = Column(Integer, nullable=True)
    valor_residual_pct = Column(Numeric(5, 2), nullable=True)   # ej. 10.00 = 10%

    # Solo aplica si tipo == "venta"
    margen_pct = Column(Numeric(5, 2), nullable=True)           # ej. 40.00 = 40%
    precio_venta = Column(Numeric(10, 2), nullable=True)        # precio final al público

    # Si se define, se avisa cuando la cantidad caiga a este número o menos
    stock_minimo = Column(Integer, nullable=True)
