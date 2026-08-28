"""
Lista oficial de módulos y acciones configurables por usuario (no
admin). Es la única fuente de verdad — tanto el backend (para
validar) como el frontend (para dibujar los checkboxes) se basan en
esta lista, así nunca quedan desincronizados.

Un admin (es_admin=True) siempre tiene acceso a todo, sin excepción —
esta lista de permisos nunca aplica para un admin.

Nota importante: algunas acciones (exportar a Excel, enviar bienvenida
o recordatorio por WhatsApp) ocurren enteramente en el navegador, sin
llamar al servidor — para esas, el permiso solo puede aplicarse
escondiendo el botón en pantalla, porque no existe ninguna petición al
backend que bloquear. El resto sí queda protegido también del lado
del servidor.
"""

MODULOS_PERMISOS = {
    "socios": [
        "crear", "editar", "eliminar", "renovar", "medir", "historial",
        "comprobante", "bienvenida", "recordatorio_proximo", "recordatorio_vencido", "exportar",
    ],
    "caja": ["ingreso", "gasto", "cerrar", "ver_anteriores"],
    "inventario": ["editar_producto", "comprar", "vender", "eliminar", "exportar"],
    "ejercicios": ["editar"],
    "mensajes": ["editar_plantillas", "enviar_recordatorios"],
}


def permisos_por_defecto(activo: bool = True) -> dict:
    """Todo prendido (equivalente a como funcionaba el sistema antes de
    tener permisos) — se usa para usuarios existentes al momento de
    esta actualización, y como punto de partida al crear uno nuevo."""
    return {
        modulo: {"activo": activo, "acciones": {accion: activo for accion in acciones}}
        for modulo, acciones in MODULOS_PERMISOS.items()
    }
