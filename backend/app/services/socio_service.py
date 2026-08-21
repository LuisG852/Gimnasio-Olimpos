"""
Lógica de negocio de Socios.
Los routers llaman a estas funciones; estas funciones hablan con la BD.
"""

from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database.models import Socio, Comprobante, MovimientoCaja
from app.schemas.socio import SocioCreate, SocioUpdate, SocioRenovar

DURACIONES_DIAS = {
    "Mensual": 30,
    "Trimestral": 91,
    "Semestral": 182,
    "Anual": 365,
}


def existe_telefono(db: Session, telefono: str, excluir_id: int | None = None):
    query = db.query(Socio).filter(Socio.telefono == telefono)
    if excluir_id is not None:
        query = query.filter(Socio.id != excluir_id)
    return query.first() is not None


def obtener_socios(db: Session):
    return db.query(Socio).order_by(Socio.fecha_vencimiento.asc()).all()


def obtener_socio_por_id(db: Session, socio_id: int):
    return db.query(Socio).filter(Socio.id == socio_id).first()


def crear_socio(db: Session, datos: SocioCreate):
    if existe_telefono(db, datos.telefono):
        raise ValueError("Ya existe un socio registrado con este número de teléfono.")

    nuevo_socio = Socio(**datos.model_dump())
    db.add(nuevo_socio)
    db.commit()
    db.refresh(nuevo_socio)
    return nuevo_socio


def actualizar_socio(db: Session, socio_id: int, datos: SocioUpdate):
    socio = obtener_socio_por_id(db, socio_id)
    if not socio:
        return None

    if existe_telefono(db, datos.telefono, excluir_id=socio_id):
        raise ValueError("Ya existe otro socio registrado con este número de teléfono.")

    for campo, valor in datos.model_dump().items():
        setattr(socio, campo, valor)
    db.commit()
    db.refresh(socio)
    return socio


def renovar_socio(db: Session, socio_id: int, datos: SocioRenovar):
    socio = obtener_socio_por_id(db, socio_id)
    if not socio:
        return None

    if datos.tipo_membresia == "Personalizado":
        dias = datos.dias or 30
    else:
        dias = DURACIONES_DIAS.get(datos.tipo_membresia, 30)

    hoy = date.today()
    fecha_base = socio.fecha_vencimiento if socio.fecha_vencimiento >= hoy else hoy
    nueva_fecha = fecha_base + timedelta(days=dias)

    socio.tipo_membresia = datos.tipo_membresia
    socio.precio = datos.precio
    socio.fecha_vencimiento = nueva_fecha
    socio.activo = True

    db.commit()
    db.refresh(socio)
    return socio


def eliminar_socio(db: Session, socio_id: int):
    socio = obtener_socio_por_id(db, socio_id)
    if not socio:
        return False
    db.delete(socio)
    db.commit()
    return True


def obtener_estadisticas(db: Session):
    socios = db.query(Socio).all()
    hoy = date.today()

    total = len(socios)
    activos = sum(1 for s in socios if s.activo)
    vencidos = sum(1 for s in socios if s.fecha_vencimiento < hoy)

    # Antes esto solo sumaba la tabla de Comprobantes (pagos de socios),
    # así que las ventas de productos del Inventario/Caja nunca contaban
    # en el ingreso estimado del mes. Ahora se suma directo de Caja
    # (movimientos tipo "ingreso"), que ya incluye ambas cosas: los pagos
    # de socios Y las ventas de productos se registran ahí por igual.
    ingresos_mes = (
        db.query(func.coalesce(func.sum(MovimientoCaja.monto), 0))
        .filter(
            MovimientoCaja.tipo == "ingreso",
            extract("month", MovimientoCaja.fecha) == hoy.month,
            extract("year", MovimientoCaja.fecha) == hoy.year,
        )
        .scalar()
    )
    ingresos_mes = float(ingresos_mes)

    por_tipo = {}
    for s in socios:
        por_tipo[s.tipo_membresia] = por_tipo.get(s.tipo_membresia, 0) + 1

    return {
        "total": total,
        "activos": activos,
        "vencidos": vencidos,
        "ingresos_mes": ingresos_mes,
        "por_tipo": por_tipo,
    }
