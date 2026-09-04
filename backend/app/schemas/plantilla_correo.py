from pydantic import BaseModel


class PlantillaCorreoUpdate(BaseModel):
    asunto: str
    cuerpo: str
