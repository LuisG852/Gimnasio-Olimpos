"""
Junta en una sola línea de tiempo lo que ya se guarda repartido en
varias tablas (quién registró cada pago, gasto, venta, compra y
movimiento de caja) — no es una tabla nueva, es una lectura combinada
de lo que el sistema ya guardaba pero que no se mostraba en ningún lado.

Los pagos de socios (inscripción, cuota de inscripción, renovación) se
muestran solo desde Caja ("Ingreso en Caja") y NO desde Comprobantes —
cada pago genera un registro en ambas tablas a la vez, así que
mostrar las dos por separado hacía que el mismo pago apareciera dos
veces en la lista, con el mismo monto y la misma fecha.
"""

from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from database.models import MovimientoCaja, Gasto, VentaProducto, CompraProducto, Producto, Usuario


def _nombre_usuario(db: Session, usuario_id: Optional[int], cache: dict) -> str:
    if not usuario_id:
        return "—"
    if usuario_id not in cache:
        u = db.query(Usuario).get(usuario_id)
        cache[usuario_id] = u.nombre if u else "(usuario eliminado)"
    return cache[usuario_id]


def obtener_actividad(db: Session, dias: int = 30, usuario_id: Optional[int] = None) -> list[dict]:
    desde = date.today() - timedelta(days=dias)
    cache_usuarios: dict = {}
    eventos = []

    # --- Movimientos de caja: ingresos y gastos del día a día ---
    # Ya incluye los pagos de socios (inscripción, cuota de inscripción,
    # renovación) en su descripción — por eso no se agrega también desde
    # Comprobantes, para no mostrar el mismo pago dos veces.
    movimientos = db.query(MovimientoCaja).filter(MovimientoCaja.fecha >= desde)
    if usuario_id:
        movimientos = movimientos.filter(MovimientoCaja.usuario_id == usuario_id)
    for m in movimientos.all():
        etiqueta = {"apertura": "Apertura de caja", "ingreso": "Ingreso en Caja", "gasto": "Gasto en Caja"}.get(m.tipo, m.tipo)
        eventos.append({
            "fecha": m.fecha.isoformat(), "hora": None,
            "usuario": _nombre_usuario(db, m.usuario_id, cache_usuarios),
            "tipo": etiqueta,
            "detalle": f"{m.descripcion} — Q{m.monto}",
        })

    # --- Gastos de Contabilidad (fijos/variables) ---
    gastos = db.query(Gasto).filter(Gasto.fecha >= desde)
    if usuario_id:
        gastos = gastos.filter(Gasto.usuario_id == usuario_id)
    for g in gastos.all():
        eventos.append({
            "fecha": g.fecha.isoformat(), "hora": None,
            "usuario": _nombre_usuario(db, g.usuario_id, cache_usuarios),
            "tipo": f"Gasto {g.tipo} (Contabilidad)",
            "detalle": f"{g.descripcion} — {g.categoria} — Q{g.monto}",
        })

    # --- Ventas de productos ---
    ventas = db.query(VentaProducto).filter(VentaProducto.fecha >= datetime.combine(desde, datetime.min.time()))
    if usuario_id:
        ventas = ventas.filter(VentaProducto.usuario_id == usuario_id)
    for v in ventas.all():
        eventos.append({
            "fecha": v.fecha.date().isoformat(), "hora": v.fecha.strftime("%H:%M"),
            "usuario": _nombre_usuario(db, v.usuario_id, cache_usuarios),
            "tipo": "Venta de producto",
            "detalle": f"{v.nombre_producto} x{v.cantidad} — Q{v.total}",
        })

    # --- Compras de inventario ---
    compras = db.query(CompraProducto).filter(CompraProducto.fecha >= desde)
    if usuario_id:
        compras = compras.filter(CompraProducto.usuario_id == usuario_id)
    for c in compras.all():
        producto = db.query(Producto).get(c.producto_id)
        nombre_producto = producto.nombre if producto else "(producto eliminado)"
        eventos.append({
            "fecha": c.fecha.isoformat(), "hora": None,
            "usuario": _nombre_usuario(db, c.usuario_id, cache_usuarios),
            "tipo": "Compra de inventario",
            "detalle": f"{nombre_producto} x{c.cantidad} — Q{c.costo_unitario} c/u",
        })

    eventos.sort(key=lambda e: (e["fecha"], e["hora"] or ""), reverse=True)
    return eventos


def usuarios_disponibles(db: Session):
    return db.query(Usuario).order_by(Usuario.nombre).all()
