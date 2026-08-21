"""
Schemas Pydantic para inventario (productos y ventas).
"""

from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class ProductoBase(BaseModel):
    nombre: str
    categoria: Optional[str] = None
    tipo: str  # "interno" | "venta"
    cantidad: int
    costo_unitario: Decimal
    vida_util_meses: Optional[int] = None
    valor_residual_pct: Optional[Decimal] = None
    margen_pct: Optional[Decimal] = None
    precio_venta: Optional[Decimal] = None
    stock_minimo: Optional[int] = None


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    cantidad: Optional[int] = None
    costo_unitario: Optional[Decimal] = None
    vida_util_meses: Optional[int] = None
    valor_residual_pct: Optional[Decimal] = None
    margen_pct: Optional[Decimal] = None
    precio_venta: Optional[Decimal] = None
    stock_minimo: Optional[int] = None
    activo: Optional[bool] = None


class ProductoOut(ProductoBase):
    id: int
    fecha_ingreso: date
    activo: bool
    depreciacion_mensual: Optional[Decimal] = None
    valor_en_libros: Optional[Decimal] = None
    precio_recomendado: Optional[Decimal] = None
    stock_bajo: bool = False

    class Config:
        from_attributes = True


class VentaProductoCreate(BaseModel):
    cantidad: int
    metodo: str  # efectivo | transferencia


class VentaProductoOut(BaseModel):
    id: int
    producto_id: Optional[int]
    nombre_producto: str
    cantidad: int
    precio_unitario: Decimal
    total: Decimal
    metodo: str

    class Config:
        from_attributes = True


class CompraProductoCreate(BaseModel):
    cantidad: int
    costo_unitario: Decimal
    fecha: Optional[date] = None  # si no se manda, se usa hoy


class CompraProductoOut(BaseModel):
    id: int
    cantidad: int
    costo_unitario: Decimal
    fecha: date

    class Config:
        from_attributes = True
