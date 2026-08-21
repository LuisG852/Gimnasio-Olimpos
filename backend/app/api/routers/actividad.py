from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.actividad import EventoActividad, UsuarioSimple
from app.services import actividad_service
from app.api.deps import get_admin_actual

router = APIRouter(dependencies=[Depends(get_admin_actual)])


@router.get("/", response_model=list[EventoActividad])
def actividad(dias: int = 30, usuario_id: Optional[int] = None, db: Session = Depends(get_db)):
    return actividad_service.obtener_actividad(db, dias=dias, usuario_id=usuario_id)


@router.get("/usuarios", response_model=list[UsuarioSimple])
def usuarios(db: Session = Depends(get_db)):
    return actividad_service.usuarios_disponibles(db)
