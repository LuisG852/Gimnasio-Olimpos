"""
Schemas Pydantic para Comprobante.
"""

from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class ComprobanteCreate(BaseModel):
    socio_id: int


class ComprobanteOut(BaseModel):
    id: int
    socio_id: Optional[int] = None
    nombre: str
    apellido: str
    fecha: date
    tipo_membresia: str
    precio: Decimal
    fecha_vencimiento: date

    class Config:
        from_attributes = True


class IngresoMensualOut(BaseModel):
    mes: str    # formato "YYYY-MM"
    total: float
