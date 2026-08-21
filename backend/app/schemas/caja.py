"""
Schemas Pydantic para caja.
"""

from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class AperturaCreate(BaseModel):
    monto: Decimal


class GastoCreate(BaseModel):
    descripcion: str
    monto: Decimal


class IngresoCreate(BaseModel):
    descripcion: str
    monto: Decimal
    metodo: str


class MovimientoOut(BaseModel):
    id: int
    fecha: date
    tipo: str
    metodo: Optional[str] = None
    descripcion: str
    monto: Decimal

    class Config:
        from_attributes = True


class ResumenCajaOut(BaseModel):
    fecha: date
    tiene_apertura: bool
    tiene_cierre: bool
    apertura: Decimal
    ingresos_efectivo: Decimal
    ingresos_transferencia: Decimal
    gastos: Decimal
    a_retirar: Decimal
    efectivo_esperado: Decimal
    movimientos: list[MovimientoOut]


class CierreResumenOut(BaseModel):
    """Versión liviana para la lista de historial (sin el detalle de movimientos)."""
    fecha: date
    apertura: Decimal
    ingresos_efectivo: Decimal
    ingresos_transferencia: Decimal
    gastos: Decimal
    a_retirar: Decimal
    efectivo_esperado: Decimal
