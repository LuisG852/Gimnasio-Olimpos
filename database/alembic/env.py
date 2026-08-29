import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from dotenv import load_dotenv
# Alembic corre por su cuenta, sin pasar por app/main.py — así que acá
# hay que cargar el .env a mano, si no, nunca se entera de los datos
# reales de conexión y termina usando el valor fijo de alembic.ini
# (que solo por casualidad coincidía con los datos de la máquina
# original). Sin esto, en una computadora nueva con otra contraseña de
# PostgreSQL, las migraciones fallarían o irían a la base equivocada.
_RUTA_ENV = os.path.join(os.path.dirname(__file__), "..", "..", "backend", ".env")
load_dotenv(_RUTA_ENV)

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

from database.database import Base, DATABASE_URL
from database.models import Socio  # noqa: F401 - registra los modelos

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Sobreescribe el valor fijo de alembic.ini con el de verdad, leído
# del .env — así las migraciones siempre usan la base de datos
# correcta de esta instalación, no la de cuando se armó el proyecto.
config.set_main_option("sqlalchemy.url", DATABASE_URL)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
