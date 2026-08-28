"""agregar permisos granulares a usuarios

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-08-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'usuarios',
        sa.Column('permisos', sa.JSON(), nullable=False, server_default='{}'),
    )

    # A los usuarios que ya existen se les da todo activado — equivalente
    # a como funcionaba el sistema antes de esta actualización — para
    # que nadie quede bloqueado de golpe justo al aplicar esto. El
    # administrador decide después, uno por uno, qué le quita a quién.
    # (La lista de módulos/acciones se repite aquí a propósito, en vez
    # de importarla del backend, para que la migración no dependa de
    # cómo esté organizado el código de la app.)
    modulos_acciones = {
        "socios": ["crear", "editar", "eliminar", "renovar", "medir", "historial",
                   "comprobante", "bienvenida", "recordatorio_proximo", "recordatorio_vencido", "exportar"],
        "caja": ["ingreso", "gasto", "cerrar", "ver_anteriores"],
        "inventario": ["editar_producto", "comprar", "vender", "eliminar", "exportar"],
        "ejercicios": ["editar"],
        "mensajes": ["editar_plantillas", "enviar_recordatorios"],
    }
    todo_activado = {
        modulo: {"activo": True, "acciones": {accion: True for accion in acciones}}
        for modulo, acciones in modulos_acciones.items()
    }

    import json
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE usuarios SET permisos = :p ::json"), {"p": json.dumps(todo_activado)})


def downgrade() -> None:
    op.drop_column('usuarios', 'permisos')
