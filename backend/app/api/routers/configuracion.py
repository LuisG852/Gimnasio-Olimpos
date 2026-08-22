"""
Router de configuración del sistema. Consultar el valor es para
cualquier usuario logueado (por ejemplo, para saber cuánto cobrar al
inscribir un socio nuevo); cambiarlo es solo para el administrador.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.configuracion import CuotaInscripcionUpdate
from app.services import configuracion_service
from app.api.deps import get_admin_actual, get_usuario_actual

router = APIRouter()

CLAVE_CUOTA_INSCRIPCION = "cuota_inscripcion"
CUOTA_INSCRIPCION_DEFAULT = "25"


@router.get("/cuota-inscripcion", dependencies=[Depends(get_usuario_actual)])
def obtener_cuota_inscripcion(db: Session = Depends(get_db)):
    valor = configuracion_service.obtener(db, CLAVE_CUOTA_INSCRIPCION, CUOTA_INSCRIPCION_DEFAULT)
    return {"cuota_inscripcion": float(valor)}


@router.put("/cuota-inscripcion", dependencies=[Depends(get_admin_actual)])
def actualizar_cuota_inscripcion(datos: CuotaInscripcionUpdate, db: Session = Depends(get_db)):
    configuracion_service.establecer(db, CLAVE_CUOTA_INSCRIPCION, str(datos.cuota_inscripcion))
    return {"cuota_inscripcion": datos.cuota_inscripcion}
