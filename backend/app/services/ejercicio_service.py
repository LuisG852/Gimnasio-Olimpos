from typing import Optional
from sqlalchemy.orm import Session
from database.models import Ejercicio


def listar(db: Session, musculo: Optional[str] = None, activo: Optional[bool] = None, buscar: Optional[str] = None):
    query = db.query(Ejercicio)
    if musculo:
        query = query.filter(Ejercicio.musculo == musculo)
    if activo is not None:
        query = query.filter(Ejercicio.activo == activo)
    if buscar:
        query = query.filter(Ejercicio.nombre.ilike(f"%{buscar}%"))
    return query.order_by(Ejercicio.musculo, Ejercicio.nombre).all()


def musculos_disponibles(db: Session):
    filas = db.query(Ejercicio.musculo).distinct().order_by(Ejercicio.musculo).all()
    return [f[0] for f in filas]


def actualizar(db: Session, ejercicio_id: int, activo: bool):
    ejercicio = db.query(Ejercicio).get(ejercicio_id)
    if not ejercicio:
        return None
    ejercicio.activo = activo
    db.commit()
    db.refresh(ejercicio)
    return ejercicio
