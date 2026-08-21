"""
Lógica de negocio de Contabilidad: gastos fijos y variables del negocio
(separados del efectivo del día a día de Caja) y el cálculo de la
utilidad neta real del mes (ingresos de Caja menos estos gastos).
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
import calendar
import io
import os

from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.graphics.shapes import Drawing, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.legends import Legend

from database.models import Gasto, MovimientoCaja, Producto
from app.schemas.contabilidad import GastoCreate, GastoUpdate

LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "static", "olimpos-logo.png")

AZUL = HexColor("#003F7D")
AMARILLO = HexColor("#FFD600")
DORADO = HexColor("#D4AF37")
INKSOFT = HexColor("#4A6E93")
LINEA = HexColor("#D7E6F0")
FONDO = HexColor("#F4FBF7")

MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]


def listar(db: Session, anio: Optional[int] = None, mes: Optional[int] = None, tipo: Optional[str] = None):
    query = db.query(Gasto)
    if anio:
        query = query.filter(extract("year", Gasto.fecha) == anio)
    if mes:
        query = query.filter(extract("month", Gasto.fecha) == mes)
    if tipo:
        query = query.filter(Gasto.tipo == tipo)
    return query.order_by(Gasto.fecha.desc()).all()


def crear(db: Session, datos: GastoCreate, usuario_id: int):
    if datos.tipo not in ("fijo", "variable"):
        raise ValueError("El tipo de gasto debe ser 'fijo' o 'variable'.")
    nuevo = Gasto(**datos.model_dump(), usuario_id=usuario_id)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def actualizar(db: Session, gasto_id: int, cambios: GastoUpdate):
    gasto = db.query(Gasto).get(gasto_id)
    if not gasto:
        return None
    for campo, valor in cambios.model_dump(exclude_unset=True).items():
        setattr(gasto, campo, valor)
    db.commit()
    db.refresh(gasto)
    return gasto


def eliminar(db: Session, gasto_id: int) -> bool:
    gasto = db.query(Gasto).get(gasto_id)
    if not gasto:
        return False
    db.delete(gasto)
    db.commit()
    return True


def _ingresos_del_mes(db: Session, anio: int, mes: int) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(MovimientoCaja.monto), 0))
        .filter(
            MovimientoCaja.tipo == "ingreso",
            extract("year", MovimientoCaja.fecha) == anio,
            extract("month", MovimientoCaja.fecha) == mes,
        )
        .scalar()
    )
    return Decimal(total)


def _depreciacion_del_mes(db: Session, anio: int, mes: int) -> Decimal:
    """El equipo de uso interno (máquinas, mancuernas, etc.) NO se cuenta
    como gasto completo el día que se compra — eso distorsionaría el mes
    de la compra con un número gigante. En cambio, se reparte su costo
    poco a poco: cada mes se suma la depreciación mensual de todo el
    equipo que ya estaba comprado para ese mes."""
    ultimo_dia_mes = date(anio, mes, calendar.monthrange(anio, mes)[1])

    productos = (
        db.query(Producto)
        .filter(
            Producto.tipo == "interno",
            Producto.activo == True,
            Producto.vida_util_meses.isnot(None),
            Producto.vida_util_meses > 0,
            Producto.fecha_ingreso <= ultimo_dia_mes,
        )
        .all()
    )

    total = Decimal("0")
    for p in productos:
        costo_total = Decimal(p.costo_unitario) * p.cantidad
        residual_pct = p.valor_residual_pct or Decimal("0")
        residual = costo_total * (residual_pct / Decimal("100"))
        total += (costo_total - residual) / p.vida_util_meses
    return total


def resumen_mensual(db: Session, anio: int, mes: int) -> dict:
    gastos_mes = (
        db.query(Gasto)
        .filter(extract("year", Gasto.fecha) == anio, extract("month", Gasto.fecha) == mes)
        .all()
    )

    gastos_fijos = sum((g.monto for g in gastos_mes if g.tipo == "fijo"), Decimal("0"))
    gastos_variables = sum((g.monto for g in gastos_mes if g.tipo == "variable"), Decimal("0"))
    depreciacion = _depreciacion_del_mes(db, anio, mes)
    ingresos = _ingresos_del_mes(db, anio, mes)

    por_categoria = {}
    for g in gastos_mes:
        por_categoria[g.categoria] = por_categoria.get(g.categoria, Decimal("0")) + g.monto
    if depreciacion > 0:
        por_categoria["Depreciación de equipo"] = depreciacion

    return {
        "anio": anio,
        "mes": mes,
        "ingresos": ingresos,
        "gastos_fijos": gastos_fijos,
        "gastos_variables": gastos_variables,
        "depreciacion": depreciacion,
        "utilidad_neta": ingresos - gastos_fijos - gastos_variables - depreciacion,
        "por_categoria": [{"categoria": c, "total": t} for c, t in sorted(por_categoria.items(), key=lambda x: -x[1])],
    }


def _grafico_barras(categorias: list[str], valores: list[float], ancho=460, alto=190, color=None) -> Drawing:
    drawing = Drawing(ancho, alto)
    chart = VerticalBarChart()
    chart.x = 45
    chart.y = 40
    chart.width = ancho - 70
    chart.height = alto - 60
    chart.data = [valores]
    chart.categoryAxis.categoryNames = categorias
    chart.categoryAxis.labels.fontSize = 7
    chart.categoryAxis.labels.angle = 25
    chart.categoryAxis.labels.dy = -12
    chart.categoryAxis.labels.dx = -4
    chart.valueAxis.valueMin = 0
    chart.valueAxis.labels.fontSize = 7
    chart.bars[0].fillColor = color or AMARILLO
    chart.barWidth = 10
    drawing.add(chart)
    return drawing


def _grafico_ingresos_gastos_utilidad(meses_nombres: list[str], ingresos: list[float], gastos: list[float], ancho=500, alto=210) -> Drawing:
    drawing = Drawing(ancho, alto)
    chart = VerticalBarChart()
    chart.x = 45
    chart.y = 50
    chart.width = ancho - 70
    chart.height = alto - 75
    chart.data = [ingresos, gastos]
    chart.categoryAxis.categoryNames = meses_nombres
    chart.categoryAxis.labels.fontSize = 7
    chart.valueAxis.valueMin = 0
    chart.valueAxis.labels.fontSize = 7
    chart.bars[0].fillColor = HexColor("#0E9A63")
    chart.bars[1].fillColor = HexColor("#D64545")
    chart.barSpacing = 2
    chart.groupSpacing = 8

    leyenda = Legend()
    leyenda.x = ancho / 2 - 60
    leyenda.y = alto - 12
    leyenda.alignment = "right"
    leyenda.fontSize = 8
    leyenda.colorNamePairs = [(HexColor("#0E9A63"), "Ingresos"), (HexColor("#D64545"), "Gastos")]
    drawing.add(chart)
    drawing.add(leyenda)
    return drawing


def historico(db: Session, meses: int = 6) -> list[dict]:
    """Los últimos N meses contando hacia atrás desde el actual (puede
    cruzar de un año a otro, ej. Nov-2025 a Abr-2026) — a diferencia de
    historico_anio(), que es un año calendario específico. Alimenta la
    gráfica de tendencia de la pantalla de Contabilidad."""
    hoy = date.today()
    resultado = []
    for i in range(meses - 1, -1, -1):
        anio, mes = hoy.year, hoy.month - i
        while mes <= 0:
            mes += 12
            anio -= 1
        r = resumen_mensual(db, anio, mes)
        resultado.append({
            "mes": f"{anio}-{mes:02d}",
            "ingresos": r["ingresos"],
            "gastos": r["gastos_fijos"] + r["gastos_variables"] + r["depreciacion"],
            "utilidad": r["utilidad_neta"],
        })
    return resultado


def historico_anio(db: Session, anio: int) -> list[dict]:
    """Los 12 meses de un año calendario específico (no 'los últimos N
    meses' como historico(), sino Enero-Diciembre de ese año puntual)."""
    resultado = []
    for m in range(1, 13):
        r = resumen_mensual(db, anio, m)
        resultado.append({
            "mes": m,
            "mes_nombre": MESES[m - 1],
            "ingresos": r["ingresos"],
            "gastos": r["gastos_fijos"] + r["gastos_variables"] + r["depreciacion"],
            "utilidad": r["utilidad_neta"],
        })
    return resultado


def resumen_anual(db: Session, anio: int) -> dict:
    meses = historico_anio(db, anio)
    con_actividad = [m for m in meses if m["ingresos"] > 0 or m["gastos"] > 0]

    mejor_mes = max(con_actividad, key=lambda m: m["utilidad"]) if con_actividad else None
    peor_mes = min(con_actividad, key=lambda m: m["utilidad"]) if con_actividad else None

    gastos_anio = db.query(Gasto).filter(extract("year", Gasto.fecha) == anio).all()
    por_categoria = {}
    for g in gastos_anio:
        por_categoria[g.categoria] = por_categoria.get(g.categoria, Decimal("0")) + g.monto

    return {
        "anio": anio,
        "meses": meses,
        "ingresos_totales": sum((m["ingresos"] for m in meses), Decimal("0")),
        "gastos_totales": sum((m["gastos"] for m in meses), Decimal("0")),
        "utilidad_total": sum((m["utilidad"] for m in meses), Decimal("0")),
        "mejor_mes": mejor_mes,
        "peor_mes": peor_mes,
        "por_categoria": [{"categoria": c, "total": t} for c, t in sorted(por_categoria.items(), key=lambda x: -x[1])],
    }
    hoy = date.today()
    resultado = []
    for i in range(meses - 1, -1, -1):
        m = hoy.month - i
        a = hoy.year
        while m <= 0:
            m += 12
            a -= 1
        r = resumen_mensual(db, a, m)
        resultado.append({
            "mes": f"{a}-{m:02d}",
            "ingresos": r["ingresos"],
            "gastos": r["gastos_fijos"] + r["gastos_variables"] + r["depreciacion"],
            "utilidad": r["utilidad_neta"],
        })
    return resultado


def duplicar_mes_anterior(db: Session, anio: int, mes: int) -> int:
    """Copia los gastos FIJOS del mes anterior hacia el mes indicado
    (para no tener que volver a escribir renta, sueldos, etc. cada mes).
    No duplica si ya existe un gasto con la misma descripción ese mes."""
    mes_anterior = mes - 1
    anio_anterior = anio
    if mes_anterior <= 0:
        mes_anterior = 12
        anio_anterior -= 1

    gastos_anteriores = (
        db.query(Gasto)
        .filter(
            Gasto.tipo == "fijo",
            extract("year", Gasto.fecha) == anio_anterior,
            extract("month", Gasto.fecha) == mes_anterior,
        )
        .all()
    )

    existentes = {
        g.descripcion
        for g in db.query(Gasto).filter(
            extract("year", Gasto.fecha) == anio, extract("month", Gasto.fecha) == mes
        ).all()
    }

    copiados = 0
    for g in gastos_anteriores:
        if g.descripcion in existentes:
            continue
        db.add(Gasto(
            descripcion=g.descripcion,
            categoria=g.categoria,
            tipo="fijo",
            monto=g.monto,
            fecha=date(anio, mes, 1),
            usuario_id=g.usuario_id,
        ))
        copiados += 1
    db.commit()
    return copiados


def generar_reporte_pdf(db: Session, anio: int, mes: int) -> bytes:
    resumen = resumen_mensual(db, anio, mes)
    gastos = (
        db.query(Gasto)
        .filter(extract("year", Gasto.fecha) == anio, extract("month", Gasto.fecha) == mes)
        .order_by(Gasto.fecha.desc())
        .all()
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.5 * inch, bottomMargin=0.5 * inch, leftMargin=0.6 * inch, rightMargin=0.6 * inch,
    )
    styles = getSampleStyleSheet()
    elementos = []

    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=0.8 * inch, height=0.8 * inch)
        elementos.append(logo)

    titulo_style = ParagraphStyle("titulo", parent=styles["Heading1"], textColor=AZUL, fontName="Helvetica-Bold", fontSize=18, spaceAfter=2, spaceBefore=6)
    sub_style = ParagraphStyle("sub", parent=styles["Normal"], textColor=INKSOFT, fontSize=11, spaceAfter=14)
    elementos.append(Paragraph("OLIMPO'S GYM", titulo_style))
    elementos.append(Paragraph(f"Reporte de Contabilidad — {MESES[mes - 1]} {anio}", sub_style))

    filas_resumen = [
        ["Ingresos del mes", f"Q{resumen['ingresos']:.2f}"],
        ["Gastos fijos", f"Q{resumen['gastos_fijos']:.2f}"],
        ["Gastos variables", f"Q{resumen['gastos_variables']:.2f}"],
        ["Depreciación de equipo", f"Q{resumen['depreciacion']:.2f}"],
        ["Utilidad neta", f"Q{resumen['utilidad_neta']:.2f}"],
    ]
    tabla_resumen = Table(filas_resumen, colWidths=[3 * inch, 2 * inch])
    tabla_resumen.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -2), "Helvetica"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), INKSOFT),
        ("TEXTCOLOR", (1, 0), (1, -1), AZUL),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, LINEA),
        ("LINEABOVE", (0, -1), (-1, -1), 1.2, DORADO),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    elementos.append(tabla_resumen)
    elementos.append(Spacer(1, 0.3 * inch))

    if resumen["por_categoria"]:
        elementos.append(Paragraph("Gastos por categoría", ParagraphStyle("h2", parent=styles["Heading2"], textColor=AZUL, fontSize=13, spaceAfter=8)))
        filas_cat = [["Categoría", "Total"]] + [[c["categoria"], f"Q{c['total']:.2f}"] for c in resumen["por_categoria"]]
        tabla_cat = Table(filas_cat, colWidths=[3 * inch, 2 * inch])
        tabla_cat.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), AZUL),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, LINEA),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elementos.append(tabla_cat)
        elementos.append(Spacer(1, 0.2 * inch))
        if len(resumen["por_categoria"]) >= 2:
            categorias = [c["categoria"] for c in resumen["por_categoria"]]
            valores = [float(c["total"]) for c in resumen["por_categoria"]]
            elementos.append(_grafico_barras(categorias, valores))
        elementos.append(Spacer(1, 0.2 * inch))

    elementos.append(Paragraph("Detalle de gastos del mes", ParagraphStyle("h2b", parent=styles["Heading2"], textColor=AZUL, fontSize=13, spaceAfter=8)))
    if gastos:
        filas_g = [["Fecha", "Descripción", "Categoría", "Tipo", "Monto"]]
        for g in gastos:
            filas_g.append([str(g.fecha), g.descripcion, g.categoria, g.tipo.capitalize(), f"Q{g.monto:.2f}"])
        tabla_g = Table(filas_g, colWidths=[0.8 * inch, 2.3 * inch, 1.1 * inch, 0.7 * inch, 0.9 * inch], repeatRows=1)
        tabla_g.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), AZUL),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.4, LINEA),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, FONDO]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elementos.append(tabla_g)
    else:
        elementos.append(Paragraph("No hay gastos registrados este mes.", styles["Normal"]))

    doc.build(elementos)
    return buffer.getvalue()


def generar_reporte_pdf_anual(db: Session, anio: int) -> bytes:
    resumen = resumen_anual(db, anio)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.5 * inch, bottomMargin=0.5 * inch, leftMargin=0.6 * inch, rightMargin=0.6 * inch,
    )
    styles = getSampleStyleSheet()
    elementos = []

    if os.path.exists(LOGO_PATH):
        elementos.append(Image(LOGO_PATH, width=0.8 * inch, height=0.8 * inch))

    titulo_style = ParagraphStyle("titulo", parent=styles["Heading1"], textColor=AZUL, fontName="Helvetica-Bold", fontSize=18, spaceAfter=2, spaceBefore=6)
    sub_style = ParagraphStyle("sub", parent=styles["Normal"], textColor=INKSOFT, fontSize=11, spaceAfter=14)
    elementos.append(Paragraph("OLIMPO'S GYM", titulo_style))
    elementos.append(Paragraph(f"Reporte anual de Contabilidad — {anio}", sub_style))

    filas_totales = [
        ["Ingresos totales del año", f"Q{resumen['ingresos_totales']:.2f}"],
        ["Gastos totales del año", f"Q{resumen['gastos_totales']:.2f}"],
        ["Utilidad neta del año", f"Q{resumen['utilidad_total']:.2f}"],
    ]
    tabla_totales = Table(filas_totales, colWidths=[3 * inch, 2 * inch])
    tabla_totales.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -2), "Helvetica"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), INKSOFT),
        ("TEXTCOLOR", (1, 0), (1, -1), AZUL),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, LINEA),
        ("LINEABOVE", (0, -1), (-1, -1), 1.2, DORADO),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    elementos.append(tabla_totales)
    elementos.append(Spacer(1, 0.25 * inch))

    if resumen["mejor_mes"]:
        texto_mejor = f"📈 Mejor mes: <b>{resumen['mejor_mes']['mes_nombre']}</b> (utilidad de Q{resumen['mejor_mes']['utilidad']:.2f})"
        texto_peor = f"📉 Mes más difícil: <b>{resumen['peor_mes']['mes_nombre']}</b> (utilidad de Q{resumen['peor_mes']['utilidad']:.2f})"
        elementos.append(Paragraph(texto_mejor, ParagraphStyle("mejor", parent=styles["Normal"], textColor=HexColor("#0E9A63"), fontSize=11, spaceAfter=4)))
        elementos.append(Paragraph(texto_peor, ParagraphStyle("peor", parent=styles["Normal"], textColor=HexColor("#D64545"), fontSize=11, spaceAfter=14)))

    elementos.append(Paragraph("Mes a mes", ParagraphStyle("h2", parent=styles["Heading2"], textColor=AZUL, fontSize=13, spaceAfter=8)))
    filas_meses = [["Mes", "Ingresos", "Gastos", "Utilidad"]]
    for m in resumen["meses"]:
        filas_meses.append([m["mes_nombre"], f"Q{m['ingresos']:.2f}", f"Q{m['gastos']:.2f}", f"Q{m['utilidad']:.2f}"])
    tabla_meses = Table(filas_meses, colWidths=[1.3 * inch, 1.3 * inch, 1.3 * inch, 1.3 * inch], repeatRows=1)
    estilo_meses = [
        ("BACKGROUND", (0, 0), (-1, 0), AZUL),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.4, LINEA),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, FONDO]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    # Resalta en verde la fila del mejor mes, para verlo de un vistazo
    if resumen["mejor_mes"]:
        fila_mejor = resumen["mejor_mes"]["mes"]
        estilo_meses.append(("BACKGROUND", (0, fila_mejor), (-1, fila_mejor), HexColor("#DFFBEC")))
    tabla_meses.setStyle(TableStyle(estilo_meses))
    elementos.append(tabla_meses)
    elementos.append(Spacer(1, 0.25 * inch))

    meses_con_datos = [m for m in resumen["meses"] if m["ingresos"] > 0 or m["gastos"] > 0]
    if len(meses_con_datos) >= 2:
        nombres = [m["mes_nombre"][:3] for m in meses_con_datos]
        ingresos = [float(m["ingresos"]) for m in meses_con_datos]
        gastos = [float(m["gastos"]) for m in meses_con_datos]
        elementos.append(_grafico_ingresos_gastos_utilidad(nombres, ingresos, gastos))
        elementos.append(Spacer(1, 0.25 * inch))

    if resumen["por_categoria"]:
        elementos.append(Paragraph("Gastos por categoría (todo el año)", ParagraphStyle("h2b", parent=styles["Heading2"], textColor=AZUL, fontSize=13, spaceAfter=8)))
        filas_cat = [["Categoría", "Total"]] + [[c["categoria"], f"Q{c['total']:.2f}"] for c in resumen["por_categoria"]]
        tabla_cat = Table(filas_cat, colWidths=[3 * inch, 2 * inch])
        tabla_cat.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), AZUL),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, LINEA),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elementos.append(tabla_cat)

    doc.build(elementos)
    return buffer.getvalue()
