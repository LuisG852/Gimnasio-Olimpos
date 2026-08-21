"""
Router de backup: genera un volcado (dump) completo de la base de
datos con pg_dump y lo entrega para descargar. Descargar, forzar un
respaldo manual, y restaurar son solo para administradores; el
respaldo "por evento" (cerrar sesión, cerrar caja) lo puede disparar
cualquier usuario logueado, porque cualquiera cierra sesión, no solo
el admin — pero ese endpoint no entrega ningún dato, solo guarda el
archivo en el servidor.

Restaurar sí se puede hacer desde un botón (a diferencia de antes),
pero con varias protecciones: pide de nuevo la contraseña del admin
aunque ya esté logueado, valida que el archivo parezca un respaldo
de este sistema, genera un respaldo del estado actual antes de tocar
nada, y aplica todo dentro de una sola transacción de PostgreSQL — si
algo falla en cualquier punto, se deshace todo automáticamente y la
base de datos queda exactamente como estaba antes de intentarlo.
"""

import os
import subprocess
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from database.database import DATABASE_URL, get_db
from app.api.deps import get_admin_actual, get_usuario_actual
from app.core.config import settings
from app.core.security import verificar_password
from app.services import backup_service

router = APIRouter()


def _url_para_pg_dump(url: str) -> str:
    # SQLAlchemy usa "postgresql+psycopg://...", pero pg_dump espera
    # el formato estándar "postgresql://..."
    return url.replace("postgresql+psycopg://", "postgresql://")


@router.get("/descargar", dependencies=[Depends(get_admin_actual)])
def descargar_backup():
    url = _url_para_pg_dump(DATABASE_URL)
    entorno = os.environ.copy()
    entorno["PGCLIENTENCODING"] = "UTF8"

    try:
        resultado = subprocess.run(
            [settings.PG_DUMP_PATH, url, "--no-owner", "--no-privileges", "--clean", "--if-exists"],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120, env=entorno,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail=(
                f"No se encontró pg_dump en '{settings.PG_DUMP_PATH}'. Configurá PG_DUMP_PATH "
                "en backend\\.env con la ruta completa (ej: C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe)."
            ),
        )

    if resultado.returncode != 0:
        raise HTTPException(status_code=500, detail=f"No se pudo generar el backup: {resultado.stderr}")

    nombre_archivo = f"backup_gimnasio_{date.today().isoformat()}.sql"
    return Response(
        content=resultado.stdout,
        media_type="application/sql",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
    )


@router.post("/ejecutar-ahora", dependencies=[Depends(get_admin_actual)])
def ejecutar_respaldo_ahora():
    """Genera el respaldo automático y limpia los viejos ya mismo, sin
    esperar a que le toque su turno diario. Útil para probar que está
    bien configurado."""
    resultado = backup_service.generar_backup_diario()
    borrados = backup_service.limpiar_backups_viejos()
    return {**resultado, "borrados": borrados, "carpeta": backup_service.settings.BACKUP_DIR}


@router.post("/evento", dependencies=[Depends(get_usuario_actual)])
def respaldo_por_evento():
    """Dispara el mismo respaldo diario, pero para usarse en momentos
    puntuales del día (al cerrar sesión) en vez de esperar el horario
    programado. Cualquier usuario logueado puede llamarlo — no admin
    únicamente — porque cualquiera cierra sesión. No entrega el
    contenido del respaldo, solo lo guarda en el servidor, así que no
    hay riesgo de exponer datos a un usuario sin permisos de admin.
    Como generar_backup_diario() ya evita duplicar el respaldo del
    mismo día, no importa si esto se dispara varias veces (por
    ejemplo, cierre de caja y luego cierre de sesión el mismo día).
    """
    resultado = backup_service.generar_backup_diario()
    return {"generado": resultado["generado"]}


@router.get("/estado", dependencies=[Depends(get_admin_actual)])
def estado_backup():
    """Para que el frontend pueda mostrar un aviso si el último intento
    de respaldo falló, o si ha pasado más de un día sin uno exitoso —
    en vez de que la única forma de enterarse sea revisando la consola
    del backend."""
    return backup_service.obtener_estado_backup()


@router.post("/restaurar", dependencies=[Depends(get_admin_actual)])
async def restaurar_backup(
    password: str = Form(...),
    archivo: UploadFile = File(...),
    usuario_actual=Depends(get_admin_actual),
    db: Session = Depends(get_db),
):
    # 1) Re-confirmar la contraseña del admin, aunque ya esté logueado.
    #    Usa 400, no 401: un 401 dispara el interceptor global del
    #    frontend que cierra la sesión sola ante cualquier "no
    #    autorizado" — acá solo se equivocó de contraseña, no hace
    #    falta echarlo del sistema por eso.
    if not verificar_password(password, usuario_actual.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta.")

    # 2) Validaciones básicas del archivo antes de intentar nada.
    if not archivo.filename.endswith(".sql"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un .sql")

    contenido = await archivo.read()
    texto = contenido.decode("utf-8", errors="ignore")

    if not backup_service.parece_backup_valido(texto):
        raise HTTPException(
            status_code=400,
            detail="El archivo no parece un respaldo válido de este sistema. No se modificó nada.",
        )

    # 2.5) Esta misma petición (por la validación de arriba, get_admin_actual,
    #    etc.) también tiene su propia conexión abierta hacia la base de
    #    datos. Si no la cerramos ANTES de restaurar, el siguiente paso
    #    (que cierra "todas las demás conexiones" para poder restaurar
    #    sin bloqueos) también mataría esta conexión sin querer, y el
    #    sistema tronaría al final tratando de cerrar una conexión ya
    #    muerta — aunque la restauración en sí haya salido bien.
    db.close()

    # 3) Respaldo de seguridad del estado ACTUAL, antes de tocar nada,
    #    por si el archivo subido resulta no ser el que querías.
    respaldo_previo = backup_service.generar_backup_diario()

    # 4) Restaurar "todo o nada": si algo falla, PostgreSQL deshace todo
    #    solo y la base de datos queda exactamente como estaba.
    resultado = backup_service.restaurar_desde_sql(texto)
    if not resultado["ok"]:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo restaurar: {resultado['motivo']} — no se modificó nada, la base de datos "
                   "sigue exactamente como estaba antes de intentarlo.",
        )

    return {
        "mensaje": "Restauración completada.",
        "respaldo_previo_generado": respaldo_previo.get("generado", False),
        "respaldo_previo_ruta": respaldo_previo.get("ruta"),
    }
