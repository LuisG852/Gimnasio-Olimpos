"""
Endpoint manual para probar el envío de recordatorios sin esperar al
scheduler automático. Útil para probar que Brevo está bien configurado.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.database import get_db
from app.services import recordatorios_service
from app.api.deps import get_admin_actual

router = APIRouter(dependencies=[Depends(get_admin_actual)])


@router.post("/enviar-ahora")
def enviar_ahora(db: Session = Depends(get_db)):
    return recordatorios_service.revisar_y_enviar(db)


@router.post("/reenviar/{socio_id}")
def reenviar_a_socio(socio_id: int, db: Session = Depends(get_db)):
    """Reenvía el correo de recordatorio a un socio puntual (para pruebas),
    sin afectar el control de "ya se le avisó" del envío automático."""
    return recordatorios_service.enviar_a_socio(db, socio_id)
