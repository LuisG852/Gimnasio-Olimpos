"""
Configuración del sistema, guardada como clave/valor en la tabla
"configuracion". Pensado para valores simples y editables desde la
pantalla de Usuarios, como la cuota de inscripción.
"""

from sqlalchemy.orm import Session
from database.models import Configuracion


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
