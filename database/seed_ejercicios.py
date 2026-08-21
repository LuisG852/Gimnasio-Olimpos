"""
Script para poblar la tabla 'ejercicios' desde el repositorio público
de gifs (JahelCuadrado/ExerciseGymGifsDB), servido gratis vía jsDelivr.

Se corre UNA SOLA VEZ (o cada vez que quieras traer ejercicios nuevos,
es seguro correrlo de nuevo — actualiza los que ya existen por su slug
y agrega los que falten, no duplica nada).

Cómo correrlo (con el venv del backend activado, porque ahí sí está
"requests" instalado):

    cd D:\\OLIMPO´S\\gimnasio-sistema\\backend
    .\\venv\\Scripts\\Activate.ps1
    $env:PYTHONPATH = "D:\\OLIMPO´S\\gimnasio-sistema"
    python ..\\database\\seed_ejercicios.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import requests
from database.database import SessionLocal
from database.models import Ejercicio

BASE_URL = "https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0"
IDIOMA = "es"


def _slug_de(musculo):
    """Los ítems de muscles.json pueden venir como texto plano o como
    objeto con distintas claves posibles según la versión del repo."""
    if isinstance(musculo, str):
        return musculo
    for clave in ("slug", "muscle", "id", "name"):
        if musculo.get(clave):
            return musculo[clave]
    return None


def _lista_ejercicios(datos):
    """La respuesta de /muscles/<musculo>.json puede venir como lista
    directa o envuelta en un objeto con la lista adentro."""
    if isinstance(datos, list):
        return datos
    for clave in ("exercises", "items", "data", "results"):
        if isinstance(datos.get(clave), list):
            return datos[clave]
    return []


def poblar():
    print("Descargando lista de grupos musculares...")
    respuesta_musculos = requests.get(f"{BASE_URL}/api/{IDIOMA}/muscles.json", timeout=30)
    musculos = respuesta_musculos.json()

    print(f"Estructura recibida (primeros 2 elementos, para revisar si algo no calza): {musculos[:2]}\n")

    db = SessionLocal()
    total_nuevos, total_actualizados = 0, 0

    try:
        for musculo in musculos:
            slug_musculo = _slug_de(musculo)
            if not slug_musculo:
                print(f"  (no se pudo identificar el músculo en: {musculo}, se salta)")
                continue

            print(f"Descargando ejercicios de: {slug_musculo}...")

            resp = requests.get(f"{BASE_URL}/api/{IDIOMA}/muscles/{slug_musculo}.json", timeout=30)
            if resp.status_code != 200:
                print(f"  (no se pudo descargar {slug_musculo}, código {resp.status_code}, se salta)")
                continue

            ejercicios = _lista_ejercicios(resp.json())
            if not ejercicios:
                print(f"  (0 ejercicios encontrados para {slug_musculo}, revisa la estructura si esto se repite)")

            for ej in ejercicios:
                slug = ej.get("slug") or ej.get("id", "").split("/")[-1]
                existente = db.query(Ejercicio).filter(Ejercicio.slug == slug).first()

                instrucciones = "\n".join(ej.get("instructions", [])) if ej.get("instructions") else None

                if existente:
                    existente.nombre = ej.get("name", existente.nombre)
                    existente.musculo = ej.get("muscle", slug_musculo)
                    existente.equipo = ej.get("equipment")
                    existente.instrucciones = instrucciones
                    existente.gif_url = ej.get("gifUrl", existente.gif_url)
                    total_actualizados += 1
                else:
                    db.add(Ejercicio(
                        slug=slug,
                        nombre=ej.get("name", slug),
                        musculo=ej.get("muscle", slug_musculo),
                        equipo=ej.get("equipment"),
                        instrucciones=instrucciones,
                        gif_url=ej.get("gifUrl", ""),
                    ))
                    total_nuevos += 1

            db.commit()

        print(f"\nListo. Ejercicios nuevos: {total_nuevos} | Actualizados: {total_actualizados}")
    finally:
        db.close()


if __name__ == "__main__":
    poblar()
