"""
Lógica de negocio de Usuarios.
"""

from sqlalchemy.orm import Session
from database.models import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate
from app.core.security import hash_password, verificar_password
from app.core.permisos import permisos_por_defecto


def existe_usuario(db: Session, usuario: str, excluir_id: int | None = None):
    query = db.query(Usuario).filter(Usuario.usuario == usuario)
    if excluir_id is not None:
        query = query.filter(Usuario.id != excluir_id)
    return query.first() is not None


def crear_usuario(db: Session, datos: UsuarioCreate):
    if existe_usuario(db, datos.usuario):
        raise ValueError("Ya existe un usuario con ese nombre de usuario.")

    # Un usuario nuevo (no admin) arranca sin ver nada hasta que el
    # administrador le prenda algo a propósito — más seguro que
    # arrancar con todo activado por accidente.
    permisos = datos.permisos if datos.permisos is not None else permisos_por_defecto(activo=False)

    nuevo = Usuario(
        nombre=datos.nombre,
        usuario=datos.usuario,
        password_hash=hash_password(datos.password),
        es_admin=datos.es_admin,
        activo=True,
        permisos=permisos,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def actualizar_usuario(db: Session, usuario_id: int, datos: UsuarioUpdate, admin_actual_id: int):
    usuario = obtener_por_id(db, usuario_id)
    if not usuario:
        return None

    if existe_usuario(db, datos.usuario, excluir_id=usuario_id):
        raise ValueError("Ya existe otro usuario con ese nombre de usuario.")

    if usuario_id == admin_actual_id and not datos.es_admin:
        raise ValueError("No podés quitarte tus propios permisos de administrador.")
    if usuario_id == admin_actual_id and not datos.activo:
        raise ValueError("No podés desactivar tu propia cuenta.")

    # Por seguridad: para cambiar la contraseña de cualquier usuario
    # (incluido uno mismo), hay que confirmar la propia contraseña.
    if datos.password:
        admin = obtener_por_id(db, admin_actual_id)
        if not datos.password_admin_actual or not verificar_password(datos.password_admin_actual, admin.password_hash):
            raise ValueError("Tu contraseña actual es incorrecta. No se cambió nada.")

    usuario.nombre = datos.nombre
    usuario.usuario = datos.usuario
    usuario.es_admin = datos.es_admin
    usuario.activo = datos.activo
    if datos.password:
        usuario.password_hash = hash_password(datos.password)
    if datos.permisos is not None:
        usuario.permisos = datos.permisos

    db.commit()
    db.refresh(usuario)
    return usuario


def eliminar_usuario(db: Session, usuario_id: int, admin_actual_id: int):
    if usuario_id == admin_actual_id:
        raise ValueError("No podés eliminar tu propia cuenta.")

    usuario = obtener_por_id(db, usuario_id)
    if not usuario:
        return False
    db.delete(usuario)
    db.commit()
    return True


def listar_usuarios(db: Session):
    return db.query(Usuario).order_by(Usuario.id.asc()).all()


def obtener_por_id(db: Session, usuario_id: int):
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def autenticar(db: Session, usuario: str, password: str):
    u = db.query(Usuario).filter(Usuario.usuario == usuario, Usuario.activo == True).first()
    if not u or not verificar_password(password, u.password_hash):
        return None
    return u
