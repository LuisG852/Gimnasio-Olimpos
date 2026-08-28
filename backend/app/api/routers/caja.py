"""
Router de caja.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.caja import AperturaCreate, GastoCreate, IngresoCreate, ResumenCajaOut, CierreResumenOut
from app.services import caja_service
from app.api.deps import get_usuario_actual, get_admin_actual, requiere_permiso

router = APIRouter(dependencies=[Depends(requiere_permiso("caja"))])


@router.get("/resumen", response_model=ResumenCajaOut)
def resumen(fecha: date = Query(default_factory=date.today), db: Session = Depends(get_db)):
    return caja_service.resumen_dia(db, fecha)


@router.get("/historial", response_model=list[CierreResumenOut], dependencies=[Depends(requiere_permiso("caja", "ver_anteriores"))])
def historial(db: Session = Depends(get_db)):
    return caja_service.historial_cierres(db)


@router.post("/apertura", response_model=ResumenCajaOut)
def apertura(datos: AperturaCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_actual)):
    try:
        caja_service.crear_apertura(db, date.today(), datos.monto, usuario.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return caja_service.resumen_dia(db, date.today())


@router.post("/gasto", response_model=ResumenCajaOut, dependencies=[Depends(requiere_permiso("caja", "gasto"))])
def gasto(datos: GastoCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_actual)):
    try:
        caja_service.crear_gasto(db, date.today(), datos, usuario.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return caja_service.resumen_dia(db, date.today())


@router.post("/ingreso", dependencies=[Depends(requiere_permiso("caja", "ingreso"))])
def ingreso(datos: IngresoCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_actual)):
    try:
        caja_service.crear_ingreso(db, date.today(), datos, usuario.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"mensaje": "Ingreso registrado"}


@router.post("/cierre", response_model=ResumenCajaOut, dependencies=[Depends(requiere_permiso("caja", "cerrar"))])
def cierre(db: Session = Depends(get_db), usuario=Depends(get_usuario_actual)):
    try:
        return caja_service.cerrar_caja(db, date.today(), usuario.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/pendientes")
def pendientes(db: Session = Depends(get_db)):
    filas = caja_service.listar_pendientes(db)
    return [
        {"id": p.id, "descripcion": p.descripcion, "monto": p.monto, "fecha": p.fecha, "motivo": p.motivo}
        for p in filas
    ]


@router.post("/pendientes/{pendiente_id}/resolver")
def resolver_pendiente(pendiente_id: int, db: Session = Depends(get_db)):
    if not caja_service.resolver_pendiente(db, pendiente_id):
        raise HTTPException(status_code=404, detail="Pendiente no encontrado")
    return {"mensaje": "Marcado como resuelto"}


@router.post("/reabrir", response_model=ResumenCajaOut)
def reabrir(db: Session = Depends(get_db), admin=Depends(get_admin_actual)):
    """Solo el administrador puede deshacer un cierre hecho por error."""
    try:
        return caja_service.reabrir_caja(db, date.today())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
