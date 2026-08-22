"""agregar tabla configuracion (cuota de inscripcion editable)

Revision ID: a1b2c3d4e5f6
Revises: 8e6f88518a5b
Create Date: 2026-08-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8e6f88518a5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'configuracion',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('clave', sa.String(length=50), nullable=False),
        sa.Column('valor', sa.String(length=200), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_configuracion_clave'), 'configuracion', ['clave'], unique=True)
    op.create_index(op.f('ix_configuracion_id'), 'configuracion', ['id'], unique=False)

    # Valor inicial: Q25 de cuota de inscripción, editable después desde
    # la pantalla de Usuarios sin tocar la base de datos a mano.
    configuracion = sa.table(
        'configuracion',
        sa.column('clave', sa.String),
        sa.column('valor', sa.String),
    )
    op.bulk_insert(configuracion, [{'clave': 'cuota_inscripcion', 'valor': '25'}])


def downgrade() -> None:
    op.drop_index(op.f('ix_configuracion_id'), table_name='configuracion')
    op.drop_index(op.f('ix_configuracion_clave'), table_name='configuracion')
    op.drop_table('configuracion')
