"""
Router de socios.
Requiere estar logueado y tener el módulo "socios" activo. Crear,
editar, eliminar y renovar además exigen su acción específica. Las
estadísticas (dinero) son solo para administradores.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.socio import SocioCreate, SocioUpdate, SocioOut, SocioRenovar, EstadisticasOut
from app.services import socio_service
from app.api.deps import get_usuario_actual, get_admin_actual, requiere_permiso

router = APIRouter(dependencies=[Depends(requiere_permiso("socios"))])


@router.get("/estadisticas", response_model=EstadisticasOut, dependencies=[Depends(get_admin_actual)])
def estadisticas(db: Session = Depends(get_db)):
    return socio_service.obtener_estadisticas(db)


@router.get("/", response_model=list[SocioOut])
def listar_socios(db: Session = Depends(get_db)):
    return socio_service.obtener_socios(db)


@router.post("/", response_model=SocioOut, dependencies=[Depends(requiere_permiso("socios", "crear"))])
def crear_socio(socio: SocioCreate, db: Session = Depends(get_db)):
    try:
        return socio_service.crear_socio(db, socio)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{socio_id}", response_model=SocioOut)
def obtener_socio(socio_id: int, db: Session = Depends(get_db)):
    socio = socio_service.obtener_socio_por_id(db, socio_id)
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    return socio


@router.put("/{socio_id}", response_model=SocioOut, dependencies=[Depends(requiere_permiso("socios", "editar"))])
def actualizar_socio(socio_id: int, socio: SocioUpdate, db: Session = Depends(get_db)):
    try:
        actualizado = socio_service.actualizar_socio(db, socio_id, socio)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not actualizado:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    return actualizado


@router.post("/{socio_id}/renovar", response_model=SocioOut, dependencies=[Depends(requiere_permiso("socios", "renovar"))])
def renovar_socio(socio_id: int, datos: SocioRenovar, db: Session = Depends(get_db)):
    renovado = socio_service.renovar_socio(db, socio_id, datos)
    if not renovado:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    return renovado


@router.delete("/{socio_id}", dependencies=[Depends(requiere_permiso("socios", "eliminar"))])
def eliminar_socio(socio_id: int, db: Session = Depends(get_db)):
    eliminado = socio_service.eliminar_socio(db, socio_id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    return {"mensaje": "Socio eliminado"}
