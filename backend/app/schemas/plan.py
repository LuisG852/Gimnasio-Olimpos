from pydantic import BaseModel
from typing import Optional


class EjercicioPlanOut(BaseModel):
    musculo: str
    musculo_slug: str
    nombre: str
    gif_url: str
    instrucciones: Optional[str] = None
    series: int
    repeticiones: str


class DiaPlanOut(BaseModel):
    dia: str
    enfoque: str
    ejercicios: list[EjercicioPlanOut]


class PlanOut(BaseModel):
    socio_nombre: str
    fecha_generado: str
    objetivo: str
    nivel: str
    split: str
    enfasis: Optional[str] = None
    dias: list[DiaPlanOut]


class EnviarPlanCorreo(BaseModel):
    destinatario_email: str
    destinatario_nombre: str
    asunto: str
    html: str
