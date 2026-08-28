"""
Schemas Pydantic para Usuario y autenticación.
"""

from pydantic import BaseModel
from typing import Optional


class UsuarioCreate(BaseModel):
    nombre: str
    usuario: str
    password: str
    es_admin: bool = False
    permisos: Optional[dict] = None    # si no se manda, se le da todo apagado por defecto (un empleado nuevo no ve nada hasta que el admin le prenda algo)


class UsuarioUpdate(BaseModel):
    nombre: str
    usuario: str
    es_admin: bool
    activo: bool
    password: Optional[str] = None                  # nueva contraseña del usuario editado (vacío = no cambiar)
    password_admin_actual: Optional[str] = None      # confirmación: tu propia contraseña, solo si vas a cambiar la de arriba
    permisos: Optional[dict] = None                  # si no se manda, se dejan los permisos como estaban


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    usuario: str
    es_admin: bool
    activo: bool
    permisos: dict = {}

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    usuario: str
    password: str


class ConfiguracionInicial(BaseModel):
    nombre: str
    usuario: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut
