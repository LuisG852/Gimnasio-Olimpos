"""
Punto de entrada del backend (FastAPI).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.api.routers import socios, mediciones, comprobantes, auth, usuarios, caja, backup, inventario, recordatorios, planes, ejercicios, contabilidad, actividad, configuracion, plantillas_correo
from database.database import SessionLocal
from app.services import recordatorios_service, backup_service

app = FastAPI(title="Sistema de Control - Gimnasio")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(usuarios.router, prefix="/api/usuarios", tags=["Usuarios"])
app.include_router(socios.router, prefix="/api/socios", tags=["Socios"])
app.include_router(mediciones.router, prefix="/api/mediciones", tags=["Mediciones"])
app.include_router(comprobantes.router, prefix="/api/comprobantes", tags=["Comprobantes"])
app.include_router(caja.router, prefix="/api/caja", tags=["Caja"])
app.include_router(backup.router, prefix="/api/backup", tags=["Backup"])
app.include_router(inventario.router, prefix="/api/inventario", tags=["Inventario"])
app.include_router(recordatorios.router, prefix="/api/recordatorios", tags=["Recordatorios"])
app.include_router(planes.router, prefix="/api/planes", tags=["Planes"])
app.include_router(ejercicios.router, prefix="/api/ejercicios", tags=["Ejercicios"])
app.include_router(contabilidad.router, prefix="/api/contabilidad", tags=["Contabilidad"])
app.include_router(actividad.router, prefix="/api/actividad", tags=["Actividad"])
app.include_router(configuracion.router, prefix="/api/configuracion", tags=["Configuración"])
app.include_router(plantillas_correo.router, prefix="/api/plantillas-correo", tags=["Plantillas de correo"])


@app.get("/")
def health_check():
    return {"status": "ok"}


def _revisar_recordatorios_job():
    db = SessionLocal()
    try:
        resultado = recordatorios_service.revisar_y_enviar(db)
        if resultado["error"]:
            print(f"[recordatorios] {resultado['error']}")
        elif resultado["enviados"]:
            print(f"[recordatorios] Enviados {len(resultado['enviados'])} correo(s) de vencimiento.")
    finally:
        db.close()


scheduler = BackgroundScheduler()
# Revisa vencimientos cada 6 horas mientras el sistema esté abierto, y
# una vez apenas arranca (con 1 minuto de margen para que todo termine
# de levantar). NOTA: esto solo corre mientras el backend está encendido,
# no es un servicio 24/7 independiente del .bat.
scheduler.add_job(_revisar_recordatorios_job, "interval", hours=6)
scheduler.add_job(_revisar_recordatorios_job, "date")  # una corrida inmediata al arrancar

# Respaldo automático de la base de datos: una vez al día mientras el
# sistema esté abierto, más una corrida al arrancar (por si ese día
# todavía no se había generado). También borra los respaldos que ya
# pasaron los días de retención configurados.
scheduler.add_job(backup_service.ejecutar_rutina_diaria, "interval", hours=24)
scheduler.add_job(backup_service.ejecutar_rutina_diaria, "date")
scheduler.start()
