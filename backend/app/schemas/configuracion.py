from pydantic import BaseModel, Field


class CuotaInscripcionUpdate(BaseModel):
    cuota_inscripcion: float = Field(ge=0, description="Monto en quetzales, 0 o más")


class PreciosMembresiaUpdate(BaseModel):
    precio_mensual: float = Field(ge=0)
    descuento_trimestral: float = Field(ge=0, le=100, description="Porcentaje de descuento, ej: 8.33")
    descuento_semestral: float = Field(ge=0, le=100)
    descuento_anual: float = Field(ge=0, le=100)
