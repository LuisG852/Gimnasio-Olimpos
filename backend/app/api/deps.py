"""
Dependencias reutilizables para proteger endpoints:
- get_usuario_actual: exige estar logueado.
- get_admin_actual: exige estar logueado Y ser administrador.
- requiere_permiso: exige estar logueado Y (ser admin, O tener
  activo ese módulo/acción específica en sus permisos).
"""

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from database.database import get_db
from app.core.security import decodificar_token
from app.services import usuario_service


def get_usuario_actual(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")

    token = authorization.split(" ", 1)[1]
    usuario_id = decodificar_token(token)
    if not usuario_id:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada")

    usuario = usuario_service.obtener_por_id(db, usuario_id)
    if not usuario or not usuario.activo:
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")

    return usuario


def get_admin_actual(usuario=Depends(get_usuario_actual)):
    if not usuario.es_admin:
        raise HTTPException(status_code=403, detail="Necesitás permisos de administrador para esto")
    return usuario


def requiere_permiso(modulo: str, accion: str = None):
    """Uso: dependencies=[Depends(requiere_permiso("socios", "eliminar"))]
    Un admin siempre pasa, sin importar lo que diga permisos. Para
    cualquier otro usuario: si no tiene el módulo activo, o (cuando se
    pide una acción puntual) esa acción activa dentro del módulo, se
    rechaza con 403."""
    def dependencia(usuario=Depends(get_usuario_actual)):
        if usuario.es_admin:
            return usuario

        permisos = usuario.permisos or {}
        config_modulo = permisos.get(modulo) or {}

        if not config_modulo.get("activo"):
            raise HTTPException(status_code=403, detail="No tenés acceso a este módulo.")

        if accion and not (config_modulo.get("acciones") or {}).get(accion):
            raise HTTPException(status_code=403, detail="No tenés permiso para hacer esto.")

        return usuario

    return dependencia
