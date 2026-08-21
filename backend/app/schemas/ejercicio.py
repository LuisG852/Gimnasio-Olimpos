from pydantic import BaseModel
from typing import Optional


class EjercicioOut(BaseModel):
    id: int
    slug: str
    nombre: str
    musculo: str
    equipo: Optional[str] = None
    gif_url: str
    activo: bool

    class Config:
        from_attributes = True


class EjercicioUpdate(BaseModel):
    activo: bool
