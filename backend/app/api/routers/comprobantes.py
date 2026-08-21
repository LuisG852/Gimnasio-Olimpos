"""
Router de comprobantes.
"""

import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database.database import get_db
from app.schemas.comprobante import ComprobanteCreate, ComprobanteOut, IngresoMensualOut
from app.services import comprobante_service
from app.api.deps import get_usuario_actual, get_admin_actual

router = APIRouter(dependencies=[Depends(get_usuario_actual)])


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


@router.get("/socio/{socio_id}/historial", response_model=list[ComprobanteOut])
def historial_comprobantes(socio_id: int, db: Session = Depends(get_db)):
    return comprobante_service.listar_por_socio(db, socio_id)


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
