"""
Lógica de negocio de Comprobantes: crear el registro, generar su PDF,
y calcular estadísticas de ingresos.
"""

import io
import os
from datetime import date

from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas

from database.models import Comprobante, Socio, MovimientoCaja

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
