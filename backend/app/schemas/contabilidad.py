from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class GastoBase(BaseModel):
    descripcion: str
    categoria: str
    tipo: str  # "fijo" | "variable"
    monto: Decimal
    fecha: date


class GastoCreate(GastoBase):
    pass


class GastoUpdate(BaseModel):
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    tipo: Optional[str] = None
    monto: Optional[Decimal] = None
    fecha: Optional[date] = None


class GastoOut(GastoBase):
    id: int

    class Config:
        from_attributes = True


class CategoriaResumen(BaseModel):
    categoria: str
    total: Decimal


class ResumenMensual(BaseModel):
    anio: int
    mes: int
    ingresos: Decimal
    gastos_fijos: Decimal
    gastos_variables: Decimal
    depreciacion: Decimal
    utilidad_neta: Decimal
    por_categoria: list[CategoriaResumen]


class MesHistorico(BaseModel):
    mes: str  # "YYYY-MM"
    ingresos: Decimal
    gastos: Decimal
    utilidad: Decimal
