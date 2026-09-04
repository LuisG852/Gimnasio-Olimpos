"""agrandar columna valor de configuracion (para plantillas de correo)

Revision ID: d4e5f6a7b8c9
Revises: b7c8d9e0f1a2
Create Date: 2026-09-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # La tabla "configuracion" (clave/valor) ya se usaba para cosas cortas
    # como la cuota de inscripción ("25") o un precio ("200"). Ahora
    # también va a guardar el asunto y el cuerpo de los correos
    # automáticos, que son bastante más largos, así que String(200) se
    # queda corto — lo pasamos a Text (sin límite).
    op.alter_column(
        'configuracion', 'valor',
        existing_type=sa.String(length=200),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'configuracion', 'valor',
        existing_type=sa.Text(),
        type_=sa.String(length=200),
        existing_nullable=False,
    )
