"""
Router de inventario (productos de uso interno y de venta).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.producto import (
    ProductoCreate, ProductoUpdate, ProductoOut, VentaProductoCreate,
    CompraProductoCreate, CompraProductoOut,
)
from app.services import producto_service
from app.api.deps import get_usuario_actual, requiere_permiso

router = APIRouter(dependencies=[Depends(requiere_permiso("inventario"))])


@router.get("/", response_model=list[ProductoOut])
def listar(tipo: Optional[str] = None, categoria: Optional[str] = None,
           activo: Optional[bool] = True, db: Session = Depends(get_db)):
    return producto_service.listar(db, tipo=tipo, categoria=categoria, activo=activo)


@router.get("/stock-bajo", response_model=list[ProductoOut])
def stock_bajo(db: Session = Depends(get_db)):
    return producto_service.stock_bajo(db)


@router.post("/", response_model=ProductoOut, dependencies=[Depends(requiere_permiso("inventario", "editar_producto"))])
def crear(datos: ProductoCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_actual)):
    try:
        return producto_service.crear(db, datos, usuario.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{producto_id}", response_model=ProductoOut, dependencies=[Depends(requiere_permiso("inventario", "editar_producto"))])
def actualizar(producto_id: int, cambios: ProductoUpdate, db: Session = Depends(get_db)):
    resultado = producto_service.actualizar(db, producto_id, cambios)
    if not resultado:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return resultado


@router.delete("/{producto_id}", dependencies=[Depends(requiere_permiso("inventario", "eliminar"))])
def eliminar(producto_id: int, db: Session = Depends(get_db)):
    if not producto_service.eliminar(db, producto_id):
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"mensaje": "Producto dado de baja"}


@router.post("/{producto_id}/comprar", response_model=ProductoOut, dependencies=[Depends(requiere_permiso("inventario", "comprar"))])
def comprar(producto_id: int, datos: CompraProductoCreate, db: Session = Depends(get_db),
            usuario=Depends(get_usuario_actual)):
    """Suma stock a un producto existente y guarda el precio/fecha de esa compra."""
    try:
        return producto_service.registrar_compra(db, producto_id, datos, usuario.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{producto_id}/compras", response_model=list[CompraProductoOut])
def historial_compras(producto_id: int, db: Session = Depends(get_db)):
    return producto_service.historial_compras(db, producto_id)


@router.post("/{producto_id}/vender", response_model=ProductoOut, dependencies=[Depends(requiere_permiso("inventario", "vender"))])
def vender(producto_id: int, datos: VentaProductoCreate, db: Session = Depends(get_db),
           usuario=Depends(get_usuario_actual)):
    try:
        return producto_service.vender(db, producto_id, datos, usuario.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
