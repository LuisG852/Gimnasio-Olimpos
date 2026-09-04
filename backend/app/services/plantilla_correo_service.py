"""
Plantillas de los correos automáticos (bienvenida, comprobante de pago,
recordatorio de vencimiento) — editables desde Mensajes, igual que las
de WhatsApp, pero guardadas en la base de datos (tabla "configuracion",
la misma que ya se usaba para la cuota de inscripción y los precios de
membresía) en vez del navegador. Así sobreviven a una instalación nueva
o a un cambio de computadora, que es justo donde las de WhatsApp no
ayudan (esas viven en localStorage).

Solo el asunto y el cuerpo (el mensaje) son editables — el resto del
correo (logo, tabla con los datos de la membresía, pie de página) se
arma aparte con datos reales del socio y no se puede editar como texto,
para que no se pueda romper el HTML por accidente.
"""

from sqlalchemy.orm import Session
from app.services import configuracion_service

# Los valores de fábrica reproducen el texto que ya tenían estos 3
# correos antes de que esto fuera editable, para que nadie note un
# cambio el día que se active esto.
DEFAULTS = {
    "bienvenida": {
        "asunto": "¡Bienvenido a {gym}!",
        "cuerpo": "¡Bienvenido, {nombre}! 🎉 Ya sos parte de {gym}. Te dejamos adjunto el comprobante de tu inscripción para que lo tengas a mano.",
    },
    "comprobante": {
        "asunto": "Tu comprobante de pago - {gym}",
        "cuerpo": "¡Hola, {nombre}! 📄 Te dejamos adjunto el comprobante de tu pago más reciente en {gym}.",
    },
    "recordatorio": {
        "asunto": "Tu membresía en {gym} {estado}",
        "cuerpo": "Te escribimos para avisarte que tu membresía {estado}. Pasa cuando puedas a renovarla para seguir entrenando sin interrupciones. ¡Te esperamos!",
    },
}

VARIABLES_POR_PLANTILLA = {
    "bienvenida": "{nombre}, {gym}, {membresia}, {vencimiento}",
    "comprobante": "{nombre}, {gym}, {membresia}, {vencimiento}",
    "recordatorio": "{nombre}, {gym}, {membresia}, {vencimiento}, {precio}, {estado}",
}


def _clave_asunto(plantilla: str) -> str:
    return f"correo_{plantilla}_asunto"


def _clave_cuerpo(plantilla: str) -> str:
    return f"correo_{plantilla}_cuerpo"


def obtener(db: Session, plantilla: str) -> dict:
    defaults = DEFAULTS[plantilla]
    return {
        "asunto": configuracion_service.obtener(db, _clave_asunto(plantilla), defaults["asunto"]),
        "cuerpo": configuracion_service.obtener(db, _clave_cuerpo(plantilla), defaults["cuerpo"]),
    }


def obtener_todas(db: Session) -> dict:
    return {
        plantilla: {**obtener(db, plantilla), "variables": VARIABLES_POR_PLANTILLA[plantilla]}
        for plantilla in DEFAULTS
    }


def establecer(db: Session, plantilla: str, asunto: str, cuerpo: str) -> None:
    configuracion_service.establecer(db, _clave_asunto(plantilla), asunto)
    configuracion_service.establecer(db, _clave_cuerpo(plantilla), cuerpo)


def aplicar_variables(texto: str, **valores) -> str:
    """Reemplaza {nombre}, {gym}, etc. en el texto — mismo mecanismo que
    aplicarPlantilla() en el frontend para las plantillas de WhatsApp."""
    resultado = texto
    for clave, valor in valores.items():
        resultado = resultado.replace("{" + clave + "}", str(valor if valor is not None else ""))
    return resultado
