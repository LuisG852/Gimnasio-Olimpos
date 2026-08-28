"""
Router de autenticación.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import Usuario
from app.schemas.usuario import LoginRequest, TokenResponse, ConfiguracionInicial
from app.services import usuario_service
from app.core.security import crear_token, hash_password

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    usuario = usuario_service.autenticar(db, datos.usuario, datos.password)
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    token = crear_token(usuario.id)
    return {"access_token": token, "token_type": "bearer", "usuario": usuario}


@router.get("/necesita-configuracion-inicial")
def necesita_configuracion_inicial(db: Session = Depends(get_db)):
    """Sin autenticación a propósito: es lo primero que el frontend
    pregunta, antes de que exista ningún usuario con quien loguearse."""
    existe_admin = db.query(Usuario).filter(Usuario.es_admin == True).first()
    return {"necesita_configuracion": existe_admin is None}


@router.post("/configuracion-inicial", response_model=TokenResponse)
def configuracion_inicial(datos: ConfiguracionInicial, db: Session = Depends(get_db)):
    """Crea la primera cuenta de administrador, con el usuario y
    contraseña que decida quien instala el sistema — nunca con datos
    fijos conocidos de antemano. Sin autenticación a propósito (todavía
    no hay ningún admin con quien loguearse), pero queda protegido de
    todos modos: en cuanto exista un admin, esta ruta se bloquea sola
    para siempre y nunca vuelve a crear otro."""
    existe_admin = db.query(Usuario).filter(Usuario.es_admin == True).first()
    if existe_admin:
        raise HTTPException(
            status_code=403,
            detail="Ya existe un administrador configurado. Esta acción solo está disponible la primera vez.",
        )

    if len(datos.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres.")

    if db.query(Usuario).filter(Usuario.usuario == datos.usuario).first():
        raise HTTPException(status_code=400, detail="Ese nombre de usuario ya está en uso.")

    admin = Usuario(
        nombre=datos.nombre,
        usuario=datos.usuario,
        password_hash=hash_password(datos.password),
        es_admin=True,
        activo=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    token = crear_token(admin.id)
    return {"access_token": token, "token_type": "bearer", "usuario": admin}
