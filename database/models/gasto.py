"""
Modelo de datos: Gasto.
Registro de gastos fijos (renta, sueldos, servicios, etc.) y variables
(puntuales) del negocio, separado del efectivo del día a día de Caja.
Se usa para calcular la utilidad neta real del mes.
"""

from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey
from database.database import Base
from datetime import date


class Gasto(Base):
    __tablename__ = "gastos_contabilidad"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(150), nullable=False)
    categoria = Column(String(50), nullable=False)   # Renta, Servicios, Salarios, Mantenimiento, Publicidad, Otro...
    tipo = Column(String(10), nullable=False)          # "fijo" | "variable"
    monto = Column(Numeric(10, 2), nullable=False)
    fecha = Column(Date, nullable=False, default=date.today)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
