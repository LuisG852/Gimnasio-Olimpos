"""
Router de autenticación.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.usuario import LoginRequest, TokenResponse
from app.services import usuario_service
from app.core.security import crear_token

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    usuario = usuario_service.autenticar(db, datos.usuario, datos.password)
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    token = crear_token(usuario.id)
    return {"access_token": token, "token_type": "bearer", "usuario": usuario}
