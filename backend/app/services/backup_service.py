"""
Respaldo automático diario de la base de datos. Reutiliza el mismo
pg_dump que ya usa el botón manual de "Descargar backup", pero en vez
de entregarlo para descargar, lo guarda directo en BACKUP_DIR — y
borra los que ya pasaron los días de retención configurados.

También incluye la restauración: aplica un .sql completo dentro de
una sola transacción con psql, así que o se aplica entero o (si algo
falla en cualquier punto) se deshace todo automáticamente y la base
de datos queda exactamente como estaba antes de intentarlo.

Y lleva un registro de cada intento (exitoso o no) en un archivo
"estado.json" dentro de BACKUP_DIR, para que el sistema pueda avisar
dentro de la propia pantalla si algo falló, en vez de que el único
lugar donde se note sea la consola del backend.
"""

import json
import os
import subprocess
import tempfile
from datetime import date, datetime, timedelta

from database.database import DATABASE_URL, engine
from app.core.config import settings

_NOMBRE_ARCHIVO_ESTADO = "estado.json"


def _url_para_pg_dump(url: str) -> str:
    return url.replace("postgresql+psycopg://", "postgresql://")


def _ruta_estado() -> str:
    return os.path.join(settings.BACKUP_DIR, _NOMBRE_ARCHIVO_ESTADO)


def _registrar_estado(resultado: dict) -> None:
    """Guarda el resultado de este intento (sea el que sea quien lo haya
    disparado: el horario automático, el botón manual, cerrar caja o
    cerrar sesión) para que obtener_estado_backup() lo pueda leer y
    avisar en pantalla si hace falta. Si esto llegara a fallar por
    cualquier motivo, no debe tumbar el respaldo en sí — solo se
    ignora silenciosamente."""
    try:
        estado = {}
        if os.path.exists(_ruta_estado()):
            with open(_ruta_estado(), "r", encoding="utf-8") as f:
                estado = json.load(f)

        ahora = datetime.now()
        estado["ultimo_intento_fecha"] = ahora.date().isoformat()
        estado["ultimo_intento_hora"] = ahora.strftime("%H:%M")
        estado["ultimo_intento_generado"] = bool(resultado.get("generado"))
        estado["ultimo_intento_motivo"] = resultado.get("motivo")
        if resultado.get("generado"):
            estado["ultimo_exitoso_fecha"] = ahora.date().isoformat()

        os.makedirs(settings.BACKUP_DIR, exist_ok=True)
        with open(_ruta_estado(), "w", encoding="utf-8") as f:
            json.dump(estado, f)
    except (OSError, json.JSONDecodeError):
        pass


def obtener_estado_backup() -> dict:
    """Lee el último estado registrado, para que el frontend pueda
    decidir si avisar de algún problema. dias_desde_ultimo_exitoso en
    None significa "nunca se ha generado un respaldo exitoso todavía"."""
    estado = {}
    if os.path.exists(_ruta_estado()):
        try:
            with open(_ruta_estado(), "r", encoding="utf-8") as f:
                estado = json.load(f)
        except (OSError, json.JSONDecodeError):
            estado = {}

    dias_desde_ultimo_exitoso = None
    if estado.get("ultimo_exitoso_fecha"):
        dias_desde_ultimo_exitoso = (date.today() - date.fromisoformat(estado["ultimo_exitoso_fecha"])).days

    return {
        "ultimo_intento_fecha": estado.get("ultimo_intento_fecha"),
        "ultimo_intento_hora": estado.get("ultimo_intento_hora"),
        "ultimo_intento_generado": estado.get("ultimo_intento_generado"),
        "ultimo_intento_motivo": estado.get("ultimo_intento_motivo"),
        "ultimo_exitoso_fecha": estado.get("ultimo_exitoso_fecha"),
        "dias_desde_ultimo_exitoso": dias_desde_ultimo_exitoso,
    }


def generar_backup_diario() -> dict:
    """Genera el respaldo del día. Si ya existía uno de hoy (por ejemplo
    el de la mañana al abrir el sistema), lo SOBREESCRIBE con este más
    reciente — así el último disparo del día (cierre de caja, cerrar
    sesión) siempre deja el respaldo más completo. Entre días distintos
    no se pisan: cada día tiene su propio archivo por la fecha en el
    nombre, y limpiar_backups_viejos() se encarga de borrar los que ya
    pasaron los días de retención configurados.

    Incluye --clean --if-exists: el archivo trae también instrucciones
    de "borrar esto primero si ya existe" antes de cada tabla, para que
    después se pueda RESTAURAR sobre una base de datos que ya tiene esas
    mismas tablas (si no, la restauración fallaría de entrada porque las
    tablas "ya existen"). Los backups generados antes de este cambio no
    tienen esas instrucciones, así que no sirven para restaurar con el
    botón — solo estos nuevos, de aquí en adelante."""
    resultado = _generar_backup_diario_interno()
    _registrar_estado(resultado)
    return resultado


def _generar_backup_diario_interno() -> dict:
    os.makedirs(settings.BACKUP_DIR, exist_ok=True)

    nombre_archivo = f"backup_gimnasio_{date.today().isoformat()}.sql"
    ruta = os.path.join(settings.BACKUP_DIR, nombre_archivo)
    ya_existia = os.path.exists(ruta)

    url = _url_para_pg_dump(DATABASE_URL)
    entorno = os.environ.copy()
    entorno["PGCLIENTENCODING"] = "UTF8"
    try:
        resultado = subprocess.run(
            [settings.PG_DUMP_PATH, url, "--no-owner", "--no-privileges", "--clean", "--if-exists"],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120, env=entorno,
        )
    except FileNotFoundError:
        return {
            "generado": False,
            "motivo": f"No se encontró pg_dump en '{settings.PG_DUMP_PATH}'. Configurá PG_DUMP_PATH en backend\\.env con la ruta completa (ej: C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe).",
            "ruta": None,
        }

    if resultado.returncode != 0:
        return {"generado": False, "motivo": resultado.stderr, "ruta": None}

    with open(ruta, "w", encoding="utf-8") as f:
        f.write(resultado.stdout)

    motivo = "Se actualizó el respaldo de hoy con los datos más recientes." if ya_existia else None
    return {"generado": True, "motivo": motivo, "ruta": ruta}


def limpiar_backups_viejos() -> int:
    if not os.path.isdir(settings.BACKUP_DIR):
        return 0

    limite = date.today() - timedelta(days=settings.BACKUP_DIAS_RETENCION)
    borrados = 0

    for nombre in os.listdir(settings.BACKUP_DIR):
        if not (nombre.startswith("backup_gimnasio_") and nombre.endswith(".sql")):
            continue
        try:
            fecha_str = nombre.replace("backup_gimnasio_", "").replace(".sql", "")
            fecha_archivo = date.fromisoformat(fecha_str)
        except ValueError:
            continue  # nombre con otro formato, no se toca

        if fecha_archivo < limite:
            os.remove(os.path.join(settings.BACKUP_DIR, nombre))
            borrados += 1

    return borrados


def ejecutar_rutina_diaria():
    resultado = generar_backup_diario()
    borrados = limpiar_backups_viejos()
    if resultado["generado"]:
        print(f"[backup] Respaldo diario generado: {resultado['ruta']}")
    elif resultado["motivo"]:
        print(f"[backup] {resultado['motivo']}")
    if borrados:
        print(f"[backup] Se borraron {borrados} respaldo(s) viejo(s) (más de {settings.BACKUP_DIAS_RETENCION} días).")


def parece_backup_valido(texto: str) -> bool:
    """Chequeo básico para atajar el caso de subir, por error, un archivo
    que no es un respaldo de este sistema (un .sql de otra cosa, un
    archivo renombrado, etc.). No es la protección principal — esa es
    que la restauración completa corre dentro de una sola transacción
    (ver restaurar_desde_sql) — esto solo evita perder tiempo intentando
    restaurar algo que evidentemente no es lo que dice ser."""
    encabezado = texto[:2000]
    parece_dump_postgres = "PostgreSQL database dump" in encabezado or "pg_dump" in encabezado
    tiene_tablas_del_sistema = "socios" in texto and "mediciones" in texto
    return parece_dump_postgres and tiene_tablas_del_sistema


def _cerrar_otras_conexiones() -> None:
    """El propio backend mantiene sus propias conexiones abiertas hacia
    esta misma base de datos todo el tiempo que está corriendo (normal,
    es lo que lo hace rápido). El problema: psql necesita borrar y
    recrear las tablas para restaurar, y PostgreSQL no lo deja avanzar
    mientras esas conexiones sigan "agarrando" esas tablas — se queda
    esperando indefinidamente en vez de fallar rápido.

    Esto le pide a PostgreSQL que cierre cualquier otra conexión a esta
    base de datos (incluidas las del propio backend) antes de restaurar.
    Es seguro: el propio SQLAlchemy vuelve a abrir conexiones nuevas
    automáticamente la próxima vez que las necesite, y como esto corre
    con el usuario de PostgreSQL configurado en DATABASE_URL, no hace
    falta ningún permiso extra."""
    engine.dispose()  # suelta primero las conexiones que el propio backend trae en su bolsa
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conexion:
        conexion.exec_driver_sql(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = current_database() AND pid <> pg_backend_pid();"
        )
    engine.dispose()  # y se suelta también la que se acaba de usar para pedir esto


def restaurar_desde_sql(sql_texto: str) -> dict:
    """Aplica un archivo .sql completo dentro de UNA sola transacción
    (--single-transaction): o se aplica entero, o si algo falla en
    cualquier punto, PostgreSQL deshace automáticamente todo lo que ya
    se había ejecutado. La base de datos nunca puede quedar "a la
    mitad" — o queda con los datos nuevos completos, o se queda
    exactamente como estaba antes de intentarlo.
    --set ON_ERROR_STOP=1 hace que se detenga apenas encuentra el
    primer error, en vez de seguir mandando el resto de instrucciones
    de un archivo que ya sabemos que se va a deshacer."""
    try:
        _cerrar_otras_conexiones()
    except Exception as e:
        return {"ok": False, "motivo": f"No se pudieron cerrar las conexiones activas antes de restaurar: {e}"}

    url = _url_para_pg_dump(DATABASE_URL)

    # newline="" es clave: el archivo subido ya trae sus propios saltos
    # de línea (típicamente \r\n, de Windows). Sin esto, Python "traduce"
    # los saltos de línea al volver a escribirlos y termina duplicando
    # una parte (\r\n se convierte en \r\r\n) — eso desordena las líneas
    # de los bloques COPY del backup y es lo que hacía que psql se
    # confundiera creyendo que había un salto de línea donde no debía.
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False, encoding="utf-8", newline="") as tmp:
        tmp.write(sql_texto)
        ruta_temporal = tmp.name

    # psql en Windows no siempre asume que el archivo está en UTF-8 (a
    # veces usa la configuración regional de Windows en su lugar), y
    # como el archivo que generamos SÍ está en UTF-8, hay que decírselo
    # explícitamente — si no, cualquier acento o carácter especial en
    # los datos (nombres de socios, notas, etc.) se lee mal y puede
    # tronar la restauración con errores confusos.
    entorno = os.environ.copy()
    entorno["PGCLIENTENCODING"] = "UTF8"

    try:
        resultado = subprocess.run(
            [settings.PSQL_PATH, url, "--single-transaction", "--set", "ON_ERROR_STOP=1", "-f", ruta_temporal],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60, env=entorno,
        )
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "motivo": "La restauración tardó más de 1 minuto y se canceló por seguridad. "
                      "No se modificó nada. Puede que otra conexión siga bloqueando las tablas.",
        }
    except FileNotFoundError:
        return {
            "ok": False,
            "motivo": f"No se encontró psql en '{settings.PSQL_PATH}'. Configurá PSQL_PATH en backend\\.env "
                      "con la ruta completa (normalmente está en la misma carpeta que pg_dump.exe).",
        }
    finally:
        os.remove(ruta_temporal)

    if resultado.returncode != 0:
        return {"ok": False, "motivo": resultado.stderr}

    return {"ok": True, "motivo": None}
