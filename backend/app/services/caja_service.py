"""
Lógica de negocio de Caja.
"""

from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from database.models import MovimientoCaja, IngresoPendiente
from app.schemas.caja import GastoCreate, IngresoCreate
from app.services import backup_service


def obtener_apertura(db: Session, fecha: date):
    return (
        db.query(MovimientoCaja)
        .filter(MovimientoCaja.fecha == fecha, MovimientoCaja.tipo == "apertura")
        .first()
    )


def obtener_cierre(db: Session, fecha: date):
    return (
        db.query(MovimientoCaja)
        .filter(MovimientoCaja.fecha == fecha, MovimientoCaja.tipo == "cierre")
        .first()
    )


def _verificar_caja_abierta_y_no_cerrada(db: Session, fecha: date):
    if not obtener_apertura(db, fecha):
        raise ValueError("Todavía no abriste la caja de hoy.")
    if obtener_cierre(db, fecha):
        raise ValueError("La caja de hoy ya está cerrada, no se pueden cargar más movimientos.")


def crear_apertura(db: Session, fecha: date, monto: Decimal, usuario_id: int):
    if obtener_apertura(db, fecha):
        raise ValueError("Ya se registró la apertura de caja de hoy.")

    nuevo = MovimientoCaja(
        fecha=fecha, tipo="apertura", metodo=None,
        descripcion="Apertura de caja", monto=monto, usuario_id=usuario_id,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def crear_gasto(db: Session, fecha: date, datos: GastoCreate, usuario_id: int):
    _verificar_caja_abierta_y_no_cerrada(db, fecha)
    nuevo = MovimientoCaja(
        fecha=fecha, tipo="gasto", metodo=None,
        descripcion=datos.descripcion, monto=datos.monto, usuario_id=usuario_id,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def registrar_pendiente(db: Session, descripcion: str, monto, fecha: date, motivo: str):
    db.add(IngresoPendiente(descripcion=descripcion, monto=monto, fecha=fecha, motivo=motivo))
    db.commit()


def crear_ingreso(db: Session, fecha: date, datos: IngresoCreate, usuario_id: int):
    if obtener_cierre(db, fecha):
        # Antes esto devolvía None sin avisar nada, y el pago simplemente
        # desaparecía. Ahora, además de avisar en el momento, se guarda
        # como "pendiente" para que quede un aviso visible en el Dashboard
        # y en Caja hasta que alguien lo agregue a mano y lo resuelva.
        registrar_pendiente(
            db, descripcion=datos.descripcion, monto=datos.monto, fecha=fecha,
            motivo="La caja de ese día ya estaba cerrada cuando se intentó registrar.",
        )
        raise ValueError(
            "La caja de hoy ya está cerrada, así que este ingreso no se pudo registrar. "
            "Quedó guardado como pendiente — vas a ver un aviso en el Dashboard y en Caja "
            "hasta que lo agregues a mano y lo marques como resuelto."
        )
    nuevo = MovimientoCaja(
        fecha=fecha, tipo="ingreso", metodo=datos.metodo,
        descripcion=datos.descripcion, monto=datos.monto, usuario_id=usuario_id,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def listar_pendientes(db: Session):
    return (
        db.query(IngresoPendiente)
        .filter(IngresoPendiente.resuelto == False)
        .order_by(IngresoPendiente.fecha_creado.desc())
        .all()
    )


def resolver_pendiente(db: Session, pendiente_id: int) -> bool:
    pendiente = db.query(IngresoPendiente).get(pendiente_id)
    if not pendiente:
        return False
    pendiente.resuelto = True
    db.commit()
    return True


def cerrar_caja(db: Session, fecha: date, usuario_id: int):
    if obtener_cierre(db, fecha):
        raise ValueError("La caja de hoy ya fue cerrada.")
    if not obtener_apertura(db, fecha):
        raise ValueError("Todavía no abriste la caja de hoy.")

    resumen = resumen_dia(db, fecha)

    nuevo = MovimientoCaja(
        fecha=fecha, tipo="cierre", metodo=None,
        descripcion=(
            f"Cierre de caja: retirar Q{resumen['a_retirar']}, "
            f"queda el fondo fijo de Q{resumen['apertura']}"
        ),
        monto=resumen["a_retirar"], usuario_id=usuario_id,
    )
    db.add(nuevo)
    db.commit()

    # El cierre de caja representa el fin del día de operaciones, así que
    # es un buen momento para respaldar. generar_backup_diario() ya evita
    # duplicados (no genera dos veces el mismo día), así que aunque
    # también se dispare el respaldo al cerrar sesión más tarde, no pasa
    # nada: el segundo intento simplemente no hace nada.
    # Si el respaldo falla, no debe impedir que el cierre de caja quede
    # guardado — solo se avisa por consola.
    try:
        backup_service.generar_backup_diario()
    except Exception as e:
        print(f"[backup] No se pudo generar el respaldo tras el cierre de caja: {e}")

    return resumen_dia(db, fecha)


def reabrir_caja(db: Session, fecha: date):
    """Deshace un cierre hecho por error. Solo funciona sobre el día de hoy."""
    cierre = obtener_cierre(db, fecha)
    if not cierre:
        raise ValueError("La caja de esa fecha no está cerrada, no hay nada que reabrir.")
    db.delete(cierre)
    db.commit()
    return resumen_dia(db, fecha)


def resumen_dia(db: Session, fecha: date):
    apertura_row = obtener_apertura(db, fecha)
    apertura = apertura_row.monto if apertura_row else Decimal("0")
    cierre_row = obtener_cierre(db, fecha)

    movimientos = (
        db.query(MovimientoCaja)
        .filter(MovimientoCaja.fecha == fecha, MovimientoCaja.tipo != "apertura")
        .order_by(MovimientoCaja.id.asc())
        .all()
    )

    ingresos_efectivo = sum((m.monto for m in movimientos if m.tipo == "ingreso" and m.metodo == "efectivo"), Decimal("0"))
    ingresos_transferencia = sum((m.monto for m in movimientos if m.tipo == "ingreso" and m.metodo == "transferencia"), Decimal("0"))
    gastos = sum((m.monto for m in movimientos if m.tipo == "gasto"), Decimal("0"))

    a_retirar = ingresos_efectivo - gastos
    efectivo_esperado = apertura + a_retirar

    return {
        "fecha": fecha,
        "tiene_apertura": apertura_row is not None,
        "tiene_cierre": cierre_row is not None,
        "apertura": apertura,
        "ingresos_efectivo": ingresos_efectivo,
        "ingresos_transferencia": ingresos_transferencia,
        "gastos": gastos,
        "a_retirar": a_retirar,
        "efectivo_esperado": efectivo_esperado,
        "movimientos": movimientos,
    }


def historial_cierres(db: Session):
    cierres = (
        db.query(MovimientoCaja)
        .filter(MovimientoCaja.tipo == "cierre")
        .order_by(MovimientoCaja.fecha.desc())
        .all()
    )
    resultado = []
    for c in cierres:
        r = resumen_dia(db, c.fecha)
        resultado.append({
            "fecha": r["fecha"],
            "apertura": r["apertura"],
            "ingresos_efectivo": r["ingresos_efectivo"],
            "ingresos_transferencia": r["ingresos_transferencia"],
            "gastos": r["gastos"],
            "a_retirar": r["a_retirar"],
            "efectivo_esperado": r["efectivo_esperado"],
        })
    return resultado
