"""
Lógica de negocio de Comprobantes: crear el registro, generar su PDF,
calcular estadísticas de ingresos, y mandar la bienvenida por correo
(con el comprobante adjunto) cuando el socio nuevo tiene correo
registrado.
"""

import base64
import io
import os
from datetime import date

from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas

from database.models import Comprobante, Socio, MovimientoCaja
from app.core.config import settings
from app.services import email_service

LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "static", "olimpos-logo.png")

AZUL = HexColor("#003F7D")
AMARILLO = HexColor("#FFD600")
DORADO = HexColor("#D4AF37")
INKSOFT = HexColor("#4A6E93")
LINEA = HexColor("#D7E6F0")
FONDO = HexColor("#F4FBF7")


def crear_comprobante(db: Session, socio_id: int, usuario_id: int | None = None):
    socio = db.query(Socio).filter(Socio.id == socio_id).first()
    if not socio:
        return None

    nuevo = Comprobante(
        socio_id=socio.id,
        nombre=socio.nombre,
        apellido=socio.apellido,
        fecha=date.today(),
        tipo_membresia=socio.tipo_membresia,
        precio=socio.precio,
        fecha_vencimiento=socio.fecha_vencimiento,
        usuario_id=usuario_id,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def obtener_por_id(db: Session, comprobante_id: int):
    return db.query(Comprobante).filter(Comprobante.id == comprobante_id).first()


def obtener_ultimo_por_socio(db: Session, socio_id: int):
    return (
        db.query(Comprobante)
        .filter(Comprobante.socio_id == socio_id)
        .order_by(Comprobante.id.desc())
        .first()
    )


def listar_por_socio(db: Session, socio_id: int):
    return (
        db.query(Comprobante)
        .filter(Comprobante.socio_id == socio_id)
        .order_by(Comprobante.fecha.desc(), Comprobante.id.desc())
        .all()
    )


def ingresos_por_mes(db: Session, meses: int = 6):
    """Total cobrado en cada uno de los últimos N meses, incluyendo el
    actual, del más viejo al más nuevo. Se suma de Caja (movimientos tipo
    "ingreso"), que incluye tanto pagos de socios como ventas de productos
    del inventario — antes solo miraba Comprobantes y se quedaba corto."""
    hoy = date.today()
    resultado = []
    for i in range(meses - 1, -1, -1):
        mes = hoy.month - i
        anio = hoy.year
        while mes <= 0:
            mes += 12
            anio -= 1

        total = (
            db.query(func.coalesce(func.sum(MovimientoCaja.monto), 0))
            .filter(
                MovimientoCaja.tipo == "ingreso",
                extract("month", MovimientoCaja.fecha) == mes,
                extract("year", MovimientoCaja.fecha) == anio,
            )
            .scalar()
        )
        resultado.append({"mes": f"{anio}-{mes:02d}", "total": float(total)})
    return resultado


def generar_pdf(comprobante: Comprobante) -> bytes:
    ancho, alto = 5.5 * inch, 7 * inch
    margen = 0.3 * inch

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(ancho, alto))

    c.setFillColor(FONDO)
    c.rect(0, 0, ancho, alto, fill=1, stroke=0)

    c.setStrokeColor(DORADO)
    c.setLineWidth(1.5)
    c.setFillColor(white)
    c.roundRect(margen, margen, ancho - 2 * margen, alto - 2 * margen, 12, fill=1, stroke=1)

    y = alto - margen - 0.35 * inch

    if os.path.exists(LOGO_PATH):
        logo_size = 1.3 * inch
        c.drawImage(
            LOGO_PATH, ancho / 2 - logo_size / 2, y - logo_size,
            width=logo_size, height=logo_size, mask="auto",
        )
    y -= 1.3 * inch + 0.25 * inch

    c.setFont("Helvetica-Bold", 17)
    c.setFillColor(AZUL)
    c.drawCentredString(ancho / 2, y, "OLIMPO'S GYM")
    y -= 0.25 * inch

    c.setFont("Helvetica", 10)
    c.setFillColor(INKSOFT)
    c.drawCentredString(ancho / 2, y, "Comprobante de pago")
    y -= 0.18 * inch

    c.setStrokeColor(AMARILLO)
    c.setLineWidth(2)
    c.line(margen + 0.25 * inch, y, ancho - margen - 0.25 * inch, y)
    y -= 0.4 * inch

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(DORADO)
    c.drawString(margen + 0.25 * inch, y, f"Recibo No. {comprobante.id:06d}")
    c.setFillColor(AZUL)
    c.drawRightString(ancho - margen - 0.25 * inch, y, str(comprobante.fecha))
    y -= 0.4 * inch

    def fila(label, valor, y):
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(INKSOFT)
        c.drawString(margen + 0.25 * inch, y, label)
        c.setFont("Helvetica", 10)
        c.setFillColor(AZUL)
        c.drawString(margen + 1.7 * inch, y, str(valor))

    fila("Socio:", f"{comprobante.nombre} {comprobante.apellido}", y)
    y -= 0.32 * inch
    fila("Plan:", comprobante.tipo_membresia, y)
    y -= 0.32 * inch
    fila("Monto pagado:", f"Q{comprobante.precio}", y)
    y -= 0.32 * inch
    fila("Próximo vencimiento:", str(comprobante.fecha_vencimiento), y)
    y -= 0.45 * inch

    c.setStrokeColor(LINEA)
    c.setLineWidth(1)
    c.line(margen + 0.25 * inch, y, ancho - margen - 0.25 * inch, y)
    y -= 0.35 * inch

    c.setFont("Helvetica-Oblique", 10)
    c.setFillColor(INKSOFT)
    c.drawCentredString(ancho / 2, y, "¡Gracias por tu pago!")
    y -= 0.2 * inch
    c.setFont("Helvetica-Oblique", 9)
    c.drawCentredString(ancho / 2, y, "Sigamos entrenando.")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def _plantilla_bienvenida(socio: Socio) -> str:
    logo_html = (
        f'<img src="{settings.GYM_LOGO_URL}" width="72" height="72" '
        f'style="display:block; margin: 0 auto 12px;" alt="{settings.GYM_NOMBRE}" />'
        if settings.GYM_LOGO_URL else ""
    )
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; background:#F4FBF7; padding: 24px 0;">
      <div style="background:#FFFFFF; border-radius: 16px; overflow:hidden; border: 1px solid #D7E6F0;">
        <div style="background:#003F7D; padding: 24px; text-align:center;">
          {logo_html}
          <h1 style="color:#FFD600; font-size: 20px; margin: 0; letter-spacing: 1px;">{settings.GYM_NOMBRE.upper()}</h1>
        </div>
        <div style="padding: 24px;">
          <p style="color:#003F7D; font-size: 16px; margin: 0 0 16px;">¡Bienvenido, <b>{socio.nombre}</b>! 🎉</p>
          <p style="color:#4A6E93; font-size: 14px; line-height: 1.5; margin: 0 0 20px;">
            Ya sos parte de {settings.GYM_NOMBRE}. Te dejamos adjunto el comprobante de tu inscripción
            para que lo tengas a mano.
          </p>

          <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #D7E6F0; color:#4A6E93; font-size: 13px;">Membresía</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #D7E6F0; color:#003F7D; font-size: 13px; text-align:right; font-weight:bold;">{socio.tipo_membresia}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color:#4A6E93; font-size: 13px;">Próximo vencimiento</td>
              <td style="padding: 10px 0; color:#003F7D; font-size: 13px; text-align:right; font-weight:bold;">{socio.fecha_vencimiento.strftime('%d/%m/%Y')}</td>
            </tr>
          </table>

          <p style="color:#4A6E93; font-size: 14px; line-height: 1.5; margin: 0;">
            ¡Nos vemos pronto en el gimnasio!
          </p>
        </div>
        <div style="background:#F4FBF7; padding: 14px; text-align:center;">
          <p style="color:#4A6E93; font-size: 11px; margin: 0;">Este es un correo automático, no hace falta que lo respondas.</p>
        </div>
      </div>
    </div>
    """


def enviar_bienvenida_por_correo(db: Session, socio_id: int) -> dict:
    """Se usa al registrar un socio nuevo, solo cuando tiene correo
    registrado (si no tiene, el frontend sigue mandando la bienvenida
    por WhatsApp como hasta ahora). Adjunta el comprobante en PDF si ya
    existe uno para este socio."""
    socio = db.query(Socio).filter(Socio.id == socio_id).first()
    if not socio:
        return {"ok": False, "error": "Socio no encontrado."}
    if not socio.correo:
        return {"ok": False, "error": "Este socio no tiene correo registrado."}

    adjuntos = None
    comprobante = obtener_ultimo_por_socio(db, socio_id)
    if comprobante:
        pdf_bytes = generar_pdf(comprobante)
        adjuntos = [{
            "name": f"comprobante_{comprobante.id:06d}.pdf",
            "content": base64.b64encode(pdf_bytes).decode("utf-8"),
        }]

    asunto = f"¡Bienvenido a {settings.GYM_NOMBRE}!"
    html = _plantilla_bienvenida(socio)

    try:
        ok = email_service.enviar_correo(socio.correo, f"{socio.nombre} {socio.apellido}", asunto, html, adjuntos=adjuntos)
    except ValueError as e:
        return {"ok": False, "error": str(e)}

    return {"ok": ok, "error": None if ok else "Brevo rechazó el envío."}
