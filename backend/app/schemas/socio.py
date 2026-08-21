"""
Schemas Pydantic para Socio.
"""

from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class SocioBase(BaseModel):
    nombre: str
    apellido: str
    telefono: str
    correo: Optional[str] = None
    fecha_inscripcion: date
    fecha_nacimiento: Optional[date] = None
    tipo_membresia: str
    precio: Decimal
    fecha_vencimiento: date
    activo: bool = True


class SocioCreate(SocioBase):
    pass


class SocioUpdate(SocioBase):
    pass


class SocioOut(SocioBase):
    id: int

    class Config:
        from_attributes = True


class SocioRenovar(BaseModel):
    tipo_membresia: str
    precio: Decimal
    dias: Optional[int] = None


class EstadisticasOut(BaseModel):
    total: int
    activos: int
    vencidos: int
    ingresos_mes: float
    por_tipo: dict
