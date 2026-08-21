"""
Lógica de negocio de Mediciones.
"""

from sqlalchemy.orm import Session
from database.models import Medicion
from app.schemas.medicion import MedicionCreate


def calcular_imc(peso, altura):
    """IMC = peso (kg) / altura (m) al cuadrado."""
    altura = float(altura)
    if altura <= 0:
        return 0
    return round(float(peso) / (altura ** 2), 2)


def listar_por_socio(db: Session, socio_id: int):
    return (
        db.query(Medicion)
        .filter(Medicion.socio_id == socio_id)
        .order_by(Medicion.fecha.desc())
        .all()
    )


def crear_medicion(db: Session, datos: MedicionCreate):
    imc = calcular_imc(datos.peso, datos.altura)
    nueva = Medicion(**datos.model_dump(), imc=imc)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


def eliminar_medicion(db: Session, medicion_id: int):
    medicion = db.query(Medicion).filter(Medicion.id == medicion_id).first()
    if not medicion:
        return False
    db.delete(medicion)
    db.commit()
    return True
