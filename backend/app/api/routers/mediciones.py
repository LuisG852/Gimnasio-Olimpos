"""
Router de mediciones.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.medicion import MedicionCreate, MedicionOut
from app.services import medicion_service

from app.api.deps import get_usuario_actual
router = APIRouter(dependencies=[Depends(get_usuario_actual)])

@router.get("/socio/{socio_id}", response_model=list[MedicionOut])
def listar_por_socio(socio_id: int, db: Session = Depends(get_db)):
    return medicion_service.listar_por_socio(db, socio_id)


@router.post("/", response_model=MedicionOut)
def crear_medicion(medicion: MedicionCreate, db: Session = Depends(get_db)):
    return medicion_service.crear_medicion(db, medicion)


@router.delete("/{medicion_id}")
def eliminar_medicion(medicion_id: int, db: Session = Depends(get_db)):
    eliminado = medicion_service.eliminar_medicion(db, medicion_id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Medición no encontrada")
    return {"mensaje": "Medición eliminada"}
