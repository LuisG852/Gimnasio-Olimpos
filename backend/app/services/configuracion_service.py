"""
Configuración del sistema, guardada como clave/valor en la tabla
"configuracion". Pensado para valores simples y editables desde la
pantalla de Usuarios, como la cuota de inscripción y los precios de
las membresías.
"""

from sqlalchemy.orm import Session
from database.models import Configuracion

# Cuántos meses representa cada plan estándar — se usa para calcular
# su precio a partir de la mensualidad y el % de descuento.
MESES_POR_PLAN = {"Mensual": 1, "Trimestral": 3, "Semestral": 6, "Anual": 12}

CLAVES_PRECIOS = {
    "precio_mensual": "200",
    # Los valores de fábrica reproducen los precios que ya tenías antes
    # de que esto fuera configurable (Q550 / Q1100 / Q1920), para que
    # nadie note un cambio de precio el día que se active esto.
    "descuento_trimestral": "8.333333",
    "descuento_semestral": "8.333333",
    "descuento_anual": "20",
}


def obtener(db: Session, clave: str, default: str) -> str:
    fila = db.query(Configuracion).filter(Configuracion.clave == clave).first()
    return fila.valor if fila else default


def establecer(db: Session, clave: str, valor: str) -> Configuracion:
    fila = db.query(Configuracion).filter(Configuracion.clave == clave).first()
    if fila:
        fila.valor = valor
    else:
        fila = Configuracion(clave=clave, valor=valor)
        db.add(fila)
    db.commit()
    db.refresh(fila)
    return fila


def obtener_config_precios(db: Session) -> dict:
    return {
        clave: float(obtener(db, clave, default))
        for clave, default in CLAVES_PRECIOS.items()
    }


def calcular_precios(config: dict) -> dict:
    """A partir de la mensualidad y los 3 porcentajes de descuento,
    calcula el precio de cada plan. Redondeado a 2 decimales."""
    mensual = config["precio_mensual"]
    return {
        "Mensual": round(mensual, 2),
        "Trimestral": round(mensual * MESES_POR_PLAN["Trimestral"] * (1 - config["descuento_trimestral"] / 100), 2),
        "Semestral": round(mensual * MESES_POR_PLAN["Semestral"] * (1 - config["descuento_semestral"] / 100), 2),
        "Anual": round(mensual * MESES_POR_PLAN["Anual"] * (1 - config["descuento_anual"] / 100), 2),
    }


def establecer_config_precios(db: Session, datos: dict) -> None:
    for clave in CLAVES_PRECIOS:
        establecer(db, clave, str(datos[clave]))
