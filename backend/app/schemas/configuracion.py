from pydantic import BaseModel, Field


class CuotaInscripcionUpdate(BaseModel):
    cuota_inscripcion: float = Field(ge=0, description="Monto en quetzales, 0 o más")
