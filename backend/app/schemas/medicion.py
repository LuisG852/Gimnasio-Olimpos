"""
Schemas Pydantic para Medicion.
"""

from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class MedicionCreate(BaseModel):
    socio_id: int
    fecha: date
    peso: Decimal
    altura: Decimal
    pecho: Optional[Decimal] = None
    cintura: Optional[Decimal] = None
    cadera: Optional[Decimal] = None
    brazo_derecho: Optional[Decimal] = None
    brazo_izquierdo: Optional[Decimal] = None
    muslo_derecho: Optional[Decimal] = None
    muslo_izquierdo: Optional[Decimal] = None
    gemelo_derecho: Optional[Decimal] = None
    gemelo_izquierdo: Optional[Decimal] = None
    notas: Optional[str] = None
    objetivo: Optional[str] = None    # bajar_peso | ganar_musculo | mantenimiento | fuerza
    nivel: Optional[str] = None        # principiante | intermedio | avanzado
    split: Optional[str] = None        # full_body | upper_lower | ppl | bro_split
    dias_por_semana: Optional[int] = None
    enfasis: Optional[str] = None      # gluteo_pierna | pecho_espalda | brazo | hombro


class MedicionOut(MedicionCreate):
    id: int
    imc: Decimal

    class Config:
        from_attributes = True
