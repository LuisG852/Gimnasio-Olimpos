"""
Utilidades de seguridad: hash de contraseñas y tokens de sesión (JWT).
"""

import bcrypt
import jwt
from datetime import datetime, timedelta
from app.core.config import settings

# La clave se lee del .env (SECRET_KEY). Si no está configurada ahí,
# se usa esta de respaldo para que el sistema no se caiga, pero no es
# lo ideal: cualquiera con el código fuente la conocería.
_CLAVE_RESPALDO = "olimpos-gym-clave-secreta-cambiar-si-se-sube-a-un-servidor"

if settings.SECRET_KEY:
    SECRET_KEY = settings.SECRET_KEY
else:
    SECRET_KEY = _CLAVE_RESPALDO
    print("[seguridad] ADVERTENCIA: no hay SECRET_KEY configurada en el .env. "
          "Se está usando una clave de respaldo. Agregá SECRET_KEY=<algo largo y "
          "aleatorio> en backend\\.env para mayor seguridad.")

ALGORITHM = "HS256"
HORAS_EXPIRACION = 12


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def crear_token(usuario_id: int) -> str:
    payload = {
        "sub": str(usuario_id),
        "exp": datetime.utcnow() + timedelta(hours=HORAS_EXPIRACION),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decodificar_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except jwt.PyJWTError:
        return None
