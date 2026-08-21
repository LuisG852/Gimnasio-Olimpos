from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.plan import PlanOut, EnviarPlanCorreo
from app.services import plan_service, email_service
from app.api.deps import get_usuario_actual

router = APIRouter(dependencies=[Depends(get_usuario_actual)])


@router.get("/generar/{medicion_id}", response_model=PlanOut)
def generar(medicion_id: int, db: Session = Depends(get_db)):
    try:
        return plan_service.generar_plan(db, medicion_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/enviar-correo")
def enviar_correo(datos: EnviarPlanCorreo):
    """Manda el plan (el mismo HTML que se ve en 'Ver plan') directo al
    correo del socio, reutilizando el mismo servicio de Brevo que ya usan
    los recordatorios de vencimiento."""
    try:
        ok = email_service.enviar_correo(datos.destinatario_email, datos.destinatario_nombre, datos.asunto, datos.html)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not ok:
        raise HTTPException(status_code=502, detail="Brevo rechazó el envío.")
    return {"ok": True}
