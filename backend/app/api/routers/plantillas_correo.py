"""
Router de las plantillas de correo (bienvenida, comprobante,
recordatorio). Verlas alcanza con tener acceso al módulo Mensajes;
guardar cambios necesita el permiso puntual "editar_plantillas" —
igual que las plantillas de WhatsApp en la misma pantalla.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.plantilla_correo import PlantillaCorreoUpdate
from app.services import plantilla_correo_service
from app.api.deps import requiere_permiso

router = APIRouter(dependencies=[Depends(requiere_permiso("mensajes"))])


@router.get("/")
def listar(db: Session = Depends(get_db)):
    return plantilla_correo_service.obtener_todas(db)


@router.put("/{clave}", dependencies=[Depends(requiere_permiso("mensajes", "editar_plantillas"))])
def actualizar(clave: str, datos: PlantillaCorreoUpdate, db: Session = Depends(get_db)):
    if clave not in plantilla_correo_service.DEFAULTS:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada.")
    plantilla_correo_service.establecer(db, clave, datos.asunto, datos.cuerpo)
    return {"mensaje": "Plantilla actualizada."}
