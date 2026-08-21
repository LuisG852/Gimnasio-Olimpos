"""
Envío de correos transaccionales usando la API HTTP de Brevo.
No se necesita librería especial de Brevo, solo "requests" — se llama
directo a su endpoint REST.
"""

import requests
from app.core.config import settings

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def enviar_correo(destinatario_email: str, destinatario_nombre: str, asunto: str, html: str) -> bool:
    """Devuelve True si Brevo aceptó el envío, False si algo falló."""
    if not settings.BREVO_API_KEY or not settings.BREVO_REMITENTE_EMAIL:
        raise ValueError(
            "Todavía no configuraste BREVO_API_KEY / BREVO_REMITENTE_EMAIL en el archivo .env del backend."
        )

    payload = {
        "sender": {"name": settings.BREVO_REMITENTE_NOMBRE, "email": settings.BREVO_REMITENTE_EMAIL},
        "to": [{"email": destinatario_email, "name": destinatario_nombre}],
        "subject": asunto,
        "htmlContent": html,
    }
    headers = {
        "api-key": settings.BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    respuesta = requests.post(BREVO_URL, json=payload, headers=headers, timeout=15)
    if respuesta.status_code not in (200, 201):
        print(f"[email] Error enviando a {destinatario_email}: {respuesta.status_code} {respuesta.text}")
        return False
    return True
