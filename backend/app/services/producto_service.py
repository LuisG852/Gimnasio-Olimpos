"""
Lógica de negocio de Inventario: CRUD de productos, cálculo de
depreciación (uso interno), precio recomendado (venta) y registro
de ventas (que además generan un ingreso en Caja y descuentan stock).
"""

from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from database.models import Producto, VentaProducto, CompraProducto, Gasto
from app.schemas.producto import (
    ProductoCreate, ProductoUpdate, ProductoOut, VentaProductoCreate,
    CompraProductoCreate, CompraProductoOut,
)
from app.schemas.caja import IngresoCreate
from app.services import caja_service


def _registrar_gasto_compra(db: Session, descripcion: str, monto: Decimal, fecha: date, usuario_id: Optional[int]):
    """Cada compra de inventario (nueva o reabastecimiento) genera
    automáticamente un gasto en Contabilidad — de otra forma la
    utilidad neta del mes quedaría inflada, sin restar lo que
    realmente se gastó comprando."""
    db.add(Gasto(
        descripcion=descripcion,
        categoria="Inventario",
        tipo="variable",
        monto=monto,
        fecha=fecha,
        usuario_id=usuario_id,
    ))
    db.commit()


def calcular_depreciacion(producto: Producto):
    """Depreciación en línea recta. Devuelve (depreciación mensual, valor en libros hoy)."""
    if producto.tipo != "interno" or not producto.vida_util_meses:
        return None, None

    costo_total = Decimal(producto.costo_unitario) * producto.cantidad
    residual_pct = producto.valor_residual_pct or Decimal("0")
    residual = costo_total * (residual_pct / Decimal("100"))
    dep_mensual = (costo_total - residual) / producto.vida_util_meses

    meses = (date.today().year - producto.fecha_ingreso.year) * 12 + \
            (date.today().month - producto.fecha_ingreso.month)
    meses = max(0, min(meses, producto.vida_util_meses))

    valor_en_libros = max(costo_total - (dep_mensual * meses), residual)
    return round(dep_mensual, 2), round(valor_en_libros, 2)


def calcular_precio_recomendado(producto: Producto):
    if producto.tipo != "venta" or not producto.margen_pct:
        return None
    margen = Decimal(producto.margen_pct) / Decimal("100")
    if margen >= 1:
        return None
    return round(Decimal(producto.costo_unitario) / (1 - margen), 2)


def _enriquecer(producto: Producto) -> ProductoOut:
    dep_mensual, valor_libros = calcular_depreciacion(producto)
    salida = ProductoOut.model_validate(producto)
    salida.depreciacion_mensual = dep_mensual
    salida.valor_en_libros = valor_libros
    salida.precio_recomendado = calcular_precio_recomendado(producto)
    salida.stock_bajo = producto.stock_minimo is not None and producto.cantidad <= producto.stock_minimo
    return salida


def listar(db: Session, tipo: Optional[str] = None, categoria: Optional[str] = None,
           activo: Optional[bool] = True):
    query = db.query(Producto)
    if tipo:
        query = query.filter(Producto.tipo == tipo)
    if categoria:
        query = query.filter(Producto.categoria == categoria)
    if activo is not None:
        query = query.filter(Producto.activo == activo)
    productos = query.order_by(Producto.nombre.asc()).all()
    return [_enriquecer(p) for p in productos]


def stock_bajo(db: Session):
    """Productos activos que ya llegaron (o están por debajo) de su
    stock mínimo configurado. Se usa para la alerta del Dashboard."""
    productos = (
        db.query(Producto)
        .filter(Producto.activo == True, Producto.stock_minimo.isnot(None))
        .order_by(Producto.nombre.asc())
        .all()
    )
    return [_enriquecer(p) for p in productos if p.cantidad <= p.stock_minimo]


def crear(db: Session, datos: ProductoCreate, usuario_id: Optional[int] = None) -> ProductoOut:
    if datos.tipo not in ("interno", "venta"):
        raise ValueError("El tipo de producto debe ser 'interno' o 'venta'.")
    nuevo = Producto(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    # Se registra la compra inicial para que el historial de precios arranque desde acá
    db.add(CompraProducto(
        producto_id=nuevo.id,
        cantidad=nuevo.cantidad,
        costo_unitario=nuevo.costo_unitario,
        fecha=nuevo.fecha_ingreso,
        usuario_id=usuario_id,
    ))
    db.commit()

    if nuevo.cantidad > 0 and nuevo.tipo == "venta":
        # Los productos "para venta" sí se cuentan como gasto completo al
        # comprarlos. El equipo de uso interno NO se registra así — su
        # costo se refleja poco a poco vía la depreciación mensual (ver
        # contabilidad_service.py), no de golpe el día que se compra.
        _registrar_gasto_compra(
            db,
            descripcion=f"Compra: {nuevo.nombre} x{nuevo.cantidad}",
            monto=Decimal(nuevo.costo_unitario) * nuevo.cantidad,
            fecha=nuevo.fecha_ingreso,
            usuario_id=usuario_id,
        )

    return _enriquecer(nuevo)


def actualizar(db: Session, producto_id: int, cambios: ProductoUpdate) -> Optional[ProductoOut]:
    producto = db.query(Producto).get(producto_id)
    if not producto:
        return None
    for campo, valor in cambios.model_dump(exclude_unset=True).items():
        setattr(producto, campo, valor)
    db.commit()
    db.refresh(producto)
    return _enriquecer(producto)


def eliminar(db: Session, producto_id: int) -> bool:
    """Baja lógica: no se borra, para no perder el historial de ventas asociado."""
    producto = db.query(Producto).get(producto_id)
    if not producto:
        return False
    producto.activo = False
    db.commit()
    return True


def registrar_compra(db: Session, producto_id: int, datos: CompraProductoCreate, usuario_id: Optional[int] = None) -> ProductoOut:
    """Agrega stock a un producto que ya existe y deja registro del precio
    y la fecha de esa compra, sin tocar los demás datos del producto
    (categoría, tipo, margen, etc.)."""
    producto = db.query(Producto).get(producto_id)
    if not producto or not producto.activo:
        raise ValueError("Producto no encontrado.")
    if datos.cantidad <= 0:
        raise ValueError("La cantidad debe ser mayor a cero.")

    fecha = datos.fecha or date.today()

    producto.cantidad += datos.cantidad
    producto.costo_unitario = datos.costo_unitario  # el costo más reciente queda como el vigente

    db.add(CompraProducto(
        producto_id=producto.id,
        cantidad=datos.cantidad,
        costo_unitario=datos.costo_unitario,
        fecha=fecha,
        usuario_id=usuario_id,
    ))
    db.commit()
    db.refresh(producto)

    _registrar_gasto_compra(
        db,
        descripcion=f"Compra: {producto.nombre} x{datos.cantidad}",
        monto=Decimal(datos.costo_unitario) * datos.cantidad,
        fecha=fecha,
        usuario_id=usuario_id,
    ) if producto.tipo == "venta" else None

    return _enriquecer(producto)


def historial_compras(db: Session, producto_id: int) -> list[CompraProductoOut]:
    compras = (
        db.query(CompraProducto)
        .filter(CompraProducto.producto_id == producto_id)
        .order_by(CompraProducto.fecha.desc(), CompraProducto.id.desc())
        .all()
    )
    return [CompraProductoOut.model_validate(c) for c in compras]


def vender(db: Session, producto_id: int, datos: VentaProductoCreate, usuario_id: int):
    if caja_service.obtener_cierre(db, date.today()):
        producto_previo = db.query(Producto).get(producto_id)
        nombre_previo = producto_previo.nombre if producto_previo else "producto"
        precio_previo = float(producto_previo.precio_venta or 0) * datos.cantidad if producto_previo else 0
        caja_service.registrar_pendiente(
            db,
            descripcion=f"Venta: {nombre_previo} x{datos.cantidad}",
            monto=precio_previo,
            fecha=date.today(),
            motivo="La caja de ese día ya estaba cerrada cuando se intentó registrar.",
        )
        raise ValueError(
            "La caja de hoy ya está cerrada, así que esta venta no se puede registrar. "
            "Quedó guardado como pendiente — vas a ver un aviso en el Dashboard y en Caja "
            "hasta que lo agregues a mano y lo marques como resuelto."
        )

    producto = db.query(Producto).get(producto_id)
    if not producto or not producto.activo:
        raise ValueError("Producto no encontrado.")
    if producto.tipo != "venta":
        raise ValueError("Este producto no está marcado como 'para venta'.")
    if not producto.precio_venta:
        raise ValueError("Este producto todavía no tiene un precio de venta definido.")
    if datos.cantidad <= 0:
        raise ValueError("La cantidad debe ser mayor a cero.")
    if producto.cantidad < datos.cantidad:
        raise ValueError(f"Stock insuficiente. Solo hay {producto.cantidad} unidades disponibles.")

    total = round(Decimal(producto.precio_venta) * datos.cantidad, 2)

    # 1) descontar stock
    producto.cantidad -= datos.cantidad

    # 2) registrar la venta
    venta = VentaProducto(
        producto_id=producto.id,
        nombre_producto=producto.nombre,
        cantidad=datos.cantidad,
        precio_unitario=producto.precio_venta,
        total=total,
        metodo=datos.metodo,
        usuario_id=usuario_id,
    )
    db.add(venta)
    db.commit()

    # 3) registrar el ingreso en Caja (mismo mecanismo que un pago de socio)
    caja_service.crear_ingreso(
        db, date.today(),
        IngresoCreate(
            descripcion=f"Venta: {producto.nombre} x{datos.cantidad}",
            monto=total,
            metodo=datos.metodo,
        ),
        usuario_id,
    )

    return _enriquecer(producto)
