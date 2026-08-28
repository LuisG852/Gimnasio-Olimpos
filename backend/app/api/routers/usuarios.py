"""
Router de usuarios. Todo este router es exclusivo del administrador.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioOut
from app.services import usuario_service
from app.api.deps import get_admin_actual
from app.core.permisos import MODULOS_PERMISOS

router = APIRouter(dependencies=[Depends(get_admin_actual)])


@router.get("/modulos-permisos")
def modulos_permisos():
    """Para que la pantalla de Usuarios dibuje los checkboxes exactos
    que el backend realmente valida — nunca desincronizados."""
    return MODULOS_PERMISOS


@router.get("/", response_model=list[UsuarioOut])
def listar(db: Session = Depends(get_db)):
    return usuario_service.listar_usuarios(db)


@router.post("/", response_model=UsuarioOut)
def crear(datos: UsuarioCreate, db: Session = Depends(get_db)):
    try:
        return usuario_service.crear_usuario(db, datos)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{usuario_id}", response_model=UsuarioOut)
def actualizar(usuario_id: int, datos: UsuarioUpdate, db: Session = Depends(get_db), admin=Depends(get_admin_actual)):
    try:
        actualizado = usuario_service.actualizar_usuario(db, usuario_id, datos, admin.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not actualizado:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return actualizado


@router.delete("/{usuario_id}")
def eliminar(usuario_id: int, db: Session = Depends(get_db), admin=Depends(get_admin_actual)):
    try:
        eliminado = usuario_service.eliminar_usuario(db, usuario_id, admin.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not eliminado:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"mensaje": "Usuario eliminado"}
