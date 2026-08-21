from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from database.database import get_db
from app.schemas.contabilidad import GastoCreate, GastoUpdate, GastoOut, ResumenMensual, MesHistorico
from app.services import contabilidad_service
from app.api.deps import get_admin_actual

router = APIRouter(dependencies=[Depends(get_admin_actual)])


@router.get("/", response_model=list[GastoOut])
def listar(anio: Optional[int] = None, mes: Optional[int] = None, tipo: Optional[str] = None,
           db: Session = Depends(get_db)):
    return contabilidad_service.listar(db, anio=anio, mes=mes, tipo=tipo)


@router.post("/", response_model=GastoOut)
def crear(datos: GastoCreate, db: Session = Depends(get_db), usuario=Depends(get_admin_actual)):
    try:
        return contabilidad_service.crear(db, datos, usuario.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{gasto_id}", response_model=GastoOut)
def actualizar(gasto_id: int, cambios: GastoUpdate, db: Session = Depends(get_db)):
    gasto = contabilidad_service.actualizar(db, gasto_id, cambios)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    return gasto


@router.delete("/{gasto_id}")
def eliminar(gasto_id: int, db: Session = Depends(get_db)):
    if not contabilidad_service.eliminar(db, gasto_id):
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    return {"mensaje": "Gasto eliminado"}


@router.get("/resumen", response_model=ResumenMensual)
def resumen(anio: int, mes: int, db: Session = Depends(get_db)):
    return contabilidad_service.resumen_mensual(db, anio, mes)


@router.get("/resumen-anual")
def resumen_anual(anio: int, db: Session = Depends(get_db)):
    return contabilidad_service.resumen_anual(db, anio)


@router.get("/historico", response_model=list[MesHistorico])
def historico(meses: int = 6, db: Session = Depends(get_db)):
    return contabilidad_service.historico(db, meses)


@router.post("/duplicar-mes-anterior")
def duplicar_mes_anterior(anio: int, mes: int, db: Session = Depends(get_db)):
    copiados = contabilidad_service.duplicar_mes_anterior(db, anio, mes)
    return {"copiados": copiados}


@router.get("/reporte-pdf")
def reporte_pdf(anio: int, mes: int, db: Session = Depends(get_db)):
    pdf_bytes = contabilidad_service.generar_reporte_pdf(db, anio, mes)
    nombre_archivo = f"contabilidad_{anio}-{mes:02d}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
    )


@router.get("/reporte-pdf-anual")
def reporte_pdf_anual(anio: int, db: Session = Depends(get_db)):
    pdf_bytes = contabilidad_service.generar_reporte_pdf_anual(db, anio)
    nombre_archivo = f"contabilidad_{anio}_anual.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
    )
