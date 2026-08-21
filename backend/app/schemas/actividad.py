from pydantic import BaseModel
from typing import Optional


class EventoActividad(BaseModel):
    fecha: str
    hora: Optional[str] = None
    usuario: str
    tipo: str
    detalle: str


class UsuarioSimple(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True
