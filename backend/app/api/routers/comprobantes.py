"""
Router de comprobantes.
Pertenece al módulo "socios". El historial de pagos tiene su propia
acción ("historial"). Generar/reimprimir el comprobante (crear, ver
el último, descargar el PDF) se queda solo con el acceso general al
módulo: esa misma función se usa automáticamente al registrar un
socio nuevo o renovarlo, así que exigirle también el permiso puntual
de "reimpresión" rompería el registro normal para alguien que no
tenga ese detalle activado. El botón de reimprimir sí se esconde en
pantalla según ese permiso — la protección ahí es a nivel de interfaz.
"""

import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.comprobante import ComprobanteCreate, ComprobanteOut, IngresoMensualOut
from app.services import comprobante_service
from app.api.deps import get_usuario_actual, get_admin_actual, requiere_permiso

router = APIRouter(dependencies=[Depends(requiere_permiso("socios"))])


@router.post("/", response_model=ComprobanteOut)
def crear_comprobante(datos: ComprobanteCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_actual)):
    comprobante = comprobante_service.crear_comprobante(db, datos.socio_id, usuario.id)
    if not comprobante:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    return comprobante


@router.get("/socio/{socio_id}/ultimo", response_model=ComprobanteOut)
def ultimo_comprobante(socio_id: int, db: Session = Depends(get_db)):
    comprobante = comprobante_service.obtener_ultimo_por_socio(db, socio_id)
    if not comprobante:
        raise HTTPException(status_code=404, detail="Este socio todavía no tiene comprobantes")
    return comprobante


@router.get("/socio/{socio_id}/historial", response_model=list[ComprobanteOut], dependencies=[Depends(requiere_permiso("socios", "historial"))])
def historial_comprobantes(socio_id: int, db: Session = Depends(get_db)):
    return comprobante_service.listar_por_socio(db, socio_id)


@router.post("/socio/{socio_id}/bienvenida-correo")
def enviar_bienvenida_correo(socio_id: int, db: Session = Depends(get_db)):
    """Bienvenida por correo con el comprobante adjunto — se usa cuando
    el socio tiene correo registrado, en vez de abrir WhatsApp."""
    resultado = comprobante_service.enviar_bienvenida_por_correo(db, socio_id)
    if not resultado["ok"]:
        raise HTTPException(status_code=400, detail=resultado["error"])
    return {"mensaje": "Correo de bienvenida enviado."}


@router.get("/ingresos-mensuales", response_model=list[IngresoMensualOut], dependencies=[Depends(get_admin_actual)])
def ingresos_mensuales(meses: int = 6, db: Session = Depends(get_db)):
    return comprobante_service.ingresos_por_mes(db, meses)


@router.get("/{comprobante_id}/pdf")
def descargar_pdf(comprobante_id: int, db: Session = Depends(get_db)):
    comprobante = comprobante_service.obtener_por_id(db, comprobante_id)
    if not comprobante:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")

    pdf_bytes = comprobante_service.generar_pdf(comprobante)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=comprobante_{comprobante_id:06d}.pdf"},
    )
