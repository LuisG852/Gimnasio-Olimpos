"""
Arma un plan de entrenamiento semanal a partir de una medición:
- objetivo y nivel: qué músculos trabajar y con qué series/repeticiones/
  cuántos ejercicios por músculo (el nivel es volumen, no el split).
- split: qué tipo de rutina (full_body, upper_lower, ppl, bro_split),
  elegido libremente por quien registra la medición.
- dias_por_semana: cuántos días asiste el socio (2 a 6); el split
  elegido se repite en ciclo hasta llenar esos días.
- enfasis: un grupo muscular opcional al que se le agrega un ejercicio
  extra ese día, para personalizar según lo que el socio quiera priorizar.

Es una recomendación por regla simple, no un algoritmo de IA.
"""

from datetime import date

from sqlalchemy.orm import Session

from database.models import Medicion, Ejercicio

NOMBRES_MUSCULO = {
    "quads": "Cuádriceps", "hamstrings": "Femorales", "glutes": "Glúteos",
    "pectorals": "Pecho", "upper-back": "Espalda alta", "lats": "Dorsales",
    "delts": "Hombros", "abs": "Abdomen", "cardio": "Cardio",
    "biceps": "Bíceps", "triceps": "Tríceps", "calves": "Pantorrillas",
}

PUSH = ["pectorals", "delts", "triceps"]
PULL = ["upper-back", "lats", "biceps"]
LEGS = ["quads", "hamstrings", "glutes", "calves"]

FULL_BODY = {
    "bajar_peso": ["quads", "hamstrings", "glutes", "pectorals", "upper-back", "delts", "cardio"],
    "mantenimiento": ["pectorals", "upper-back", "quads", "glutes", "delts"],
    "ganar_musculo": ["pectorals", "upper-back", "quads", "hamstrings", "delts", "biceps", "triceps"],
    "fuerza": ["quads", "hamstrings", "glutes", "pectorals", "upper-back", "delts"],
}

# Patrón de cada split: lista de bloques (enfoque + músculos) que se
# repite en ciclo hasta llenar los días que el socio vaya a entrenar.
SPLITS = {
    "upper_lower": [
        {"enfoque": "Torso (Upper)", "musculos": PUSH + PULL},
        {"enfoque": "Pierna (Lower)", "musculos": LEGS},
    ],
    "ppl": [
        {"enfoque": "Empuje (Push): pecho, hombro, tríceps", "musculos": PUSH},
        {"enfoque": "Jalón (Pull): espalda, bíceps", "musculos": PULL},
        {"enfoque": "Pierna (Legs)", "musculos": LEGS},
    ],
    "bro_split": [
        {"enfoque": "Pecho", "musculos": ["pectorals"]},
        {"enfoque": "Espalda", "musculos": ["upper-back", "lats"]},
        {"enfoque": "Pierna", "musculos": ["quads", "hamstrings", "glutes", "calves"]},
        {"enfoque": "Hombro", "musculos": ["delts"]},
        {"enfoque": "Brazo", "musculos": ["biceps", "triceps"]},
    ],
}

NOMBRES_SPLIT = {
    "full_body": "Cuerpo completo",
    "upper_lower": "Torso / Pierna",
    "ppl": "Push / Pull / Legs",
    "bro_split": "Split por músculo",
}

NOMBRES_ENFASIS = {
    "gluteo_pierna": "Glúteo y pierna",
    "pecho_espalda": "Pecho y espalda",
    "brazo": "Brazo",
    "hombro": "Hombro",
}

ENFASIS_MUSCULOS = {
    "gluteo_pierna": ["glutes", "quads"],
    "pecho_espalda": ["pectorals", "upper-back"],
    "brazo": ["biceps", "triceps"],
    "hombro": ["delts"],
}

SERIES_REPS_POR_OBJETIVO = {
    "bajar_peso": {"series": 3, "repeticiones": "15-20"},
    "ganar_musculo": {"series": 4, "repeticiones": "8-12"},
    "fuerza": {"series": 5, "repeticiones": "4-6"},
    "mantenimiento": {"series": 3, "repeticiones": "10-12"},
}

EJERCICIOS_POR_MUSCULO_SEGUN_NIVEL = {
    "principiante": 1,
    "intermedio": 2,
    "avanzado": 3,
}

DIAS_SEMANA_SEGUN_CANTIDAD = {
    2: ["Lunes", "Jueves"],
    3: ["Lunes", "Miércoles", "Viernes"],
    4: ["Lunes", "Martes", "Jueves", "Viernes"],
    5: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
    6: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
}


def _estructura_dias(objetivo: str, split: str, dias_por_semana: int) -> list[dict]:
    dias_por_semana = max(2, min(6, dias_por_semana or 3))
    nombres_dias = DIAS_SEMANA_SEGUN_CANTIDAD[dias_por_semana]

    if split == "full_body" or split not in SPLITS:
        patron = [{"enfoque": "Cuerpo completo", "musculos": FULL_BODY.get(objetivo, FULL_BODY["mantenimiento"])}]
    else:
        patron = SPLITS[split]

    estructura = []
    for i, nombre_dia in enumerate(nombres_dias):
        bloque = patron[i % len(patron)]
        estructura.append({"dia": nombre_dia, "enfoque": bloque["enfoque"], "musculos": list(bloque["musculos"])})
    return estructura


def generar_plan(db: Session, medicion_id: int) -> dict:
    medicion = db.query(Medicion).get(medicion_id)
    if not medicion:
        raise ValueError("Medición no encontrada.")

    objetivo = medicion.objetivo or "mantenimiento"
    nivel = medicion.nivel or "principiante"
    split = medicion.split or "full_body"
    dias_por_semana = medicion.dias_por_semana or 3
    enfasis = medicion.enfasis

    n_por_musculo = EJERCICIOS_POR_MUSCULO_SEGUN_NIVEL.get(nivel, 2)
    series_reps = SERIES_REPS_POR_OBJETIVO.get(objetivo, SERIES_REPS_POR_OBJETIVO["mantenimiento"])
    musculos_enfasis = ENFASIS_MUSCULOS.get(enfasis, [])

    dias_plan = []
    for dia in _estructura_dias(objetivo, split, dias_por_semana):
        musculos_del_dia = list(dia["musculos"])
        if "abs" not in musculos_del_dia:
            musculos_del_dia.append("abs")  # un poco de abdomen todos los días, no ocupa un día aparte

        ejercicios_dia = []
        for musculo in musculos_del_dia:
            cantidad = n_por_musculo + (1 if musculo in musculos_enfasis else 0)
            candidatos = (
                db.query(Ejercicio)
                .filter(Ejercicio.musculo == musculo, Ejercicio.activo == True)
                .order_by(Ejercicio.id)
                .limit(cantidad)
                .all()
            )
            for ej in candidatos:
                ejercicios_dia.append({
                    "musculo": NOMBRES_MUSCULO.get(musculo, musculo.capitalize()),
                    "musculo_slug": musculo,
                    "nombre": ej.nombre,
                    "gif_url": ej.gif_url,
                    "instrucciones": ej.instrucciones,
                    "series": series_reps["series"],
                    "repeticiones": series_reps["repeticiones"],
                })
        dias_plan.append({"dia": dia["dia"], "enfoque": dia["enfoque"], "ejercicios": ejercicios_dia})

    return {
        "socio_nombre": f"{medicion.socio.nombre} {medicion.socio.apellido}",
        "fecha_generado": date.today().isoformat(),
        "objetivo": objetivo,
        "nivel": nivel,
        "split": NOMBRES_SPLIT.get(split, split),
        "enfasis": NOMBRES_ENFASIS.get(enfasis) if enfasis else None,
        "dias": dias_plan,
    }
