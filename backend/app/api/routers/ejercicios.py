"""
Router de ejercicios.
Listar (y la lista de músculos) queda abierto a cualquier usuario
logueado a propósito: la pantalla de Mediciones (dentro de Socios) los
usa para armar los planes recomendados, sin importar si esa persona
tiene el módulo "Ejercicios" activado o no — solo la acción de EDITAR
(ocultar/mostrar un ejercicio) exige tener ese módulo y su permiso.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.ejercicio import EjercicioOut, EjercicioUpdate
from app.services import ejercicio_service
from app.api.deps import get_usuario_actual, requiere_permiso

router = APIRouter(dependencies=[Depends(get_usuario_actual)])


@router.get("/", response_model=list[EjercicioOut])
def listar(musculo: Optional[str] = None, activo: Optional[bool] = None, buscar: Optional[str] = None,
           db: Session = Depends(get_db)):
    return ejercicio_service.listar(db, musculo=musculo, activo=activo, buscar=buscar)


@router.get("/musculos")
def musculos(db: Session = Depends(get_db)):
    return ejercicio_service.musculos_disponibles(db)


@router.put("/{ejercicio_id}", response_model=EjercicioOut, dependencies=[Depends(requiere_permiso("ejercicios", "editar"))])
def actualizar(ejercicio_id: int, cambios: EjercicioUpdate, db: Session = Depends(get_db)):
    ejercicio = ejercicio_service.actualizar(db, ejercicio_id, cambios.activo)
    if not ejercicio:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    return ejercicio
