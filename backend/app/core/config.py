"""
Configuración centralizada del backend.
"""

import os
from dotenv import load_dotenv

# Antes esto usaba load_dotenv() a secas, que busca el .env en la carpeta
# desde donde se LANZÓ el proceso (y hacia arriba, nunca hacia subcarpetas).
# Si el .bat arranca el backend desde otra carpeta que no sea "backend/",
# nunca encontraba el archivo aunque estuviera bien puesto ahí.
# Ahora se calcula la ruta exacta sin importar desde dónde se ejecute.
_CARPETA_BACKEND = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_RUTA_ENV = os.path.join(_CARPETA_BACKEND, ".env")
load_dotenv(_RUTA_ENV)


class Settings:
    APP_NAME: str = "Sistema de Control - Gimnasio"
    DEBUG: bool = os.getenv("DEBUG", "False") == "True"
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://usuario:password@localhost:5432/gimnasio_db"
    )

    # --- Sesiones (login) ---
    # Clave usada para firmar los tokens de sesión. Si no está configurada
    # en el .env, se usa una clave por defecto (no ideal, pero el sistema
    # sigue funcionando) y se avisa por consola para que la agregues.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")

    # --- Correos automáticos (Brevo) ---
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    BREVO_REMITENTE_EMAIL: str = os.getenv("BREVO_REMITENTE_EMAIL", "")
    BREVO_REMITENTE_NOMBRE: str = os.getenv("BREVO_REMITENTE_NOMBRE", "Olimpo's Gym")
    GYM_NOMBRE: str = os.getenv("GYM_NOMBRE", "Olimpo's Gym")
    # URL pública del logo para que se vea en los correos (Gmail bloquea
    # imágenes en base64 incrustadas, necesita ser una URL real)
    GYM_LOGO_URL: str = os.getenv("GYM_LOGO_URL", "")
    # Con cuántos días de anticipación se avisa antes del vencimiento
    DIAS_AVISO_VENCIMIENTO: int = int(os.getenv("DIAS_AVISO_VENCIMIENTO", "3"))

    # --- Respaldos automáticos ---
    # Carpeta donde se guardan los .sql diarios. Si querés que suban solo
    # a la nube, pon aquí la ruta de una carpeta de Google Drive/OneDrive
    # que ya tengas sincronizada en esta compu (ej: "C:\Users\TuUsuario\OneDrive\RespaldosGym").
    # Si se deja vacío, se guardan en una carpeta "backups" dentro de "backend".
    BACKUP_DIR: str = os.getenv("BACKUP_DIR", "") or os.path.join(_CARPETA_BACKEND, "backups")
    # Ruta al programa pg_dump. Por defecto asume que está en el PATH del
    # sistema ("pg_dump" a secas); si el respaldo automático dice que no
    # lo encuentra, poné aquí la ruta completa, ej:
    # C:\Program Files\PostgreSQL\16\bin\pg_dump.exe
    PG_DUMP_PATH: str = os.getenv("PG_DUMP_PATH", "") or "pg_dump"
    # Ruta al programa psql (viene instalado junto a pg_dump, en la misma
    # carpeta de PostgreSQL). Se usa para RESTAURAR un backup. Por defecto
    # asume que está en el PATH del sistema.
    PSQL_PATH: str = os.getenv("PSQL_PATH", "") or "psql"
    # Cuántos días de respaldos se conservan antes de borrar los más viejos
    BACKUP_DIAS_RETENCION: int = int(os.getenv("BACKUP_DIAS_RETENCION", "30"))


settings = Settings()
