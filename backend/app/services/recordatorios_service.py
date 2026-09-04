"""
Revisa qué socios están por vencer y les manda un correo de recordatorio
(uno solo por cada vencimiento, no se repite hasta que el socio renueve).
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from database.models import Socio
from app.core.config import settings
from app.services import email_service, plantilla_correo_service


def _plantilla(db: Session, socio: Socio) -> tuple[str, str]:
    dias_restantes = (socio.fecha_vencimiento - date.today()).days
    if dias_restantes < 0:
        estado = f"venció el {socio.fecha_vencimiento.strftime('%d/%m/%Y')}"
    elif dias_restantes == 0:
        estado = "vence hoy"
    else:
        estado = f"vence el {socio.fecha_vencimiento.strftime('%d/%m/%Y')}"

    plantilla = plantilla_correo_service.obtener(db, "recordatorio")
    variables = dict(
        nombre=socio.nombre, gym=settings.GYM_NOMBRE,
        membresia=socio.tipo_membresia,
        vencimiento=socio.fecha_vencimiento.strftime("%d/%m/%Y"),
        precio=f"{float(socio.precio):.2f}",
        estado=estado,
    )
    asunto = plantilla_correo_service.aplicar_variables(plantilla["asunto"], **variables)
    mensaje = plantilla_correo_service.aplicar_variables(plantilla["cuerpo"], **variables)

    # Gmail y la mayoría de correos bloquean imágenes en base64 incrustadas
    # en el HTML, así que el logo solo se muestra si hay una URL pública
    # real configurada (GYM_LOGO_URL en el .env).
    logo_html = (
        f'<img src="{settings.GYM_LOGO_URL}" width="72" height="72" '
        f'style="display:block; margin: 0 auto 12px;" alt="{settings.GYM_NOMBRE}" />'
        if settings.GYM_LOGO_URL else ""
    )

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; background:#F4FBF7; padding: 24px 0;">
      <div style="background:#FFFFFF; border-radius: 16px; overflow:hidden; border: 1px solid #D7E6F0;">
        <div style="background:#003F7D; padding: 24px; text-align:center;">
          {logo_html}
          <h1 style="color:#FFD600; font-size: 20px; margin: 0; letter-spacing: 1px;">{settings.GYM_NOMBRE.upper()}</h1>
        </div>
        <div style="padding: 24px;">
          <p style="color:#003F7D; font-size: 15px; margin: 0 0 16px;">{mensaje}</p>

          <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #D7E6F0; color:#4A6E93; font-size: 13px;">Membresía</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #D7E6F0; color:#003F7D; font-size: 13px; text-align:right; font-weight:bold;">{socio.tipo_membresia}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #D7E6F0; color:#4A6E93; font-size: 13px;">Fecha de vencimiento</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #D7E6F0; color:#003F7D; font-size: 13px; text-align:right; font-weight:bold;">{socio.fecha_vencimiento.strftime('%d/%m/%Y')}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color:#4A6E93; font-size: 13px;">Precio de renovación</td>
              <td style="padding: 10px 0; color:#D4AF37; font-size: 15px; text-align:right; font-weight:bold;">Q{float(socio.precio):.2f}</td>
            </tr>
          </table>
        </div>
        <div style="background:#F4FBF7; padding: 14px; text-align:center;">
          <p style="color:#4A6E93; font-size: 11px; margin: 0;">Este es un correo automático, no hace falta que lo respondas.</p>
        </div>
      </div>
    </div>
    """
    return asunto, html


def enviar_a_socio(db: Session, socio_id: int) -> dict:
    """Reenvía el correo de recordatorio a un socio puntual, para pruebas.
    A propósito NO actualiza recordatorio_correo_enviado, así no interfiere
    con el envío automático normal (no cuenta como "ya se le avisó")."""
    socio = db.query(Socio).get(socio_id)
    if not socio:
        return {"ok": False, "error": "Socio no encontrado."}
    if not socio.correo:
        return {"ok": False, "error": "Ese socio no tiene correo registrado."}

    try:
        asunto, html = _plantilla(db, socio)
        ok = email_service.enviar_correo(socio.correo, f"{socio.nombre} {socio.apellido}", asunto, html)
    except ValueError as e:
        return {"ok": False, "error": str(e)}

    return {"ok": ok, "error": None if ok else "Brevo rechazó el envío."}


def revisar_y_enviar(db: Session) -> dict:
    hoy = date.today()
    limite = hoy + timedelta(days=settings.DIAS_AVISO_VENCIMIENTO)

    candidatos = (
        db.query(Socio)
        .filter(Socio.activo == True)
        .filter(Socio.correo.isnot(None))
        .filter(Socio.correo != "")
        .filter(Socio.fecha_vencimiento <= limite)
        .all()
    )

    enviados, fallidos = [], []
    for socio in candidatos:
        # Ya se le mandó el aviso para este mismo vencimiento
        if socio.recordatorio_correo_enviado == socio.fecha_vencimiento:
            continue
        try:
            asunto, html = _plantilla(db, socio)
            ok = email_service.enviar_correo(socio.correo, f"{socio.nombre} {socio.apellido}", asunto, html)
            if ok:
                socio.recordatorio_correo_enviado = socio.fecha_vencimiento
                db.commit()
                enviados.append(socio.correo)
            else:
                fallidos.append(socio.correo)
        except ValueError:
            # Brevo no está configurado todavía: no truena el proceso, solo se detiene
            return {"enviados": [], "fallidos": [], "error": "Brevo no está configurado en el .env todavía."}

    return {"enviados": enviados, "fallidos": fallidos, "error": None}
