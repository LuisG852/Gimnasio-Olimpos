# Control Gym - Sistema de Control de Gimnasio

App completa para gestionar socios, membresías, recordatorios por WhatsApp
y un dashboard con estadísticas del negocio.

```
gimnasio-sistema/
├── database/     → Modelos SQLAlchemy + migraciones (Alembic)
├── backend/       → API con FastAPI
└── frontend/       → Interfaz con React + Tailwind (Dashboard, Socios, Mensajes)
```

## Requisitos en la computadora donde lo instales

- Python 3.10 o superior
- Node.js (versión LTS) → https://nodejs.org
- PostgreSQL → https://www.postgresql.org/download/
- pgAdmin4 (viene incluido con PostgreSQL) para crear la base gráficamente

## 1. Base de datos

Creá la base `gimnasio` en pgAdmin4 (clic derecho en Databases → Create → Database → nombre `gimnasio`).

```bash
cd database
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

Editá `alembic.ini` y `database.py`: reemplazá `usuario` y `password` por tus datos reales de PostgreSQL. Si tenés error de codificación en Windows, usá el driver `psycopg` en vez de `psycopg2`:

```
postgresql+psycopg://postgres:TU_CONTRASEÑA@localhost:5432/gimnasio
```

Generá las tablas:

```bash
alembic revision --autogenerate -m "crear tablas iniciales"
alembic upgrade head
```

## 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env       # Windows
# cp .env.example .env       # Mac/Linux
```

Editá `.env` con tu misma URL de conexión, y corré:

```bash
uvicorn app.main:app --reload
```

Queda corriendo en `http://localhost:8000` (documentación en `/docs`).

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Queda corriendo en `http://localhost:5173`. Abrí esa URL en el navegador — ahí vivís la app: crear/editar/borrar socios, mandar WhatsApp con un clic, ver el dashboard.

## Cómo instalarlo en OTRA computadora

Es exactamente el mismo proceso que la primera vez:

1. Copiá toda la carpeta `gimnasio-sistema` a la otra computadora (o subila a un pendrive/Google Drive y descargala ahí).
2. Instalá en esa computadora: Python, Node.js y PostgreSQL (los mismos requisitos de arriba).
3. Repetí los pasos 1, 2 y 3 de este README en esa computadora — cada máquina necesita su propia base de datos local y sus propias dependencias instaladas (los `venv` y `node_modules` no se copian, se generan de nuevo).

Los **datos de los socios no se copian solos** entre computadoras porque cada una tiene su propia base PostgreSQL local. Si querés que la recepción y la administración vean los mismos datos desde 2 computadoras distintas, hay que usar un **servidor central** (ver sección siguiente) en vez de que cada máquina tenga su base de datos separada.

## Para que varias computadoras vean los mismos datos (multi-usuario real)

Ahora mismo el sistema corre "local": la base de datos vive en la misma computadora que el backend. Si el gimnasio va a tener más de una computadora usando el sistema al mismo tiempo (recepción + oficina, por ejemplo), hay que mover la base de datos y el backend a un servidor:

- **Más simple:** dejar la base de datos y el backend corriendo en UNA computadora (la de recepción, por ejemplo, siempre encendida), y que las demás computadoras solo abran el frontend apuntando a la IP de esa máquina en vez de `localhost`.
- **Más robusto:** subir el backend y la base de datos a un servidor en la nube (ej. Railway, Render, o una base de datos administrada como Neon/Supabase). Esto permite acceder desde cualquier lugar, incluso desde el celular.

Si querés, en otro momento armamos ese paso — implica cambiar `DATABASE_URL` y la URL del `api.js` del frontend para que apunten al servidor en vez de `localhost`.

## Notas de arquitectura

- Los mensajes de WhatsApp se envían con **un clic**: se abre WhatsApp con el mensaje ya escrito (gratis, sin necesidad de cuenta de WhatsApp Business API).
- Las plantillas de mensajes se guardan en el navegador de cada computadora (podés personalizarlas en la pestaña "Mensajes").
- El dashboard se calcula en tiempo real a partir de los socios cargados: total, activos, vencidos, ingresos estimados del mes y distribución por tipo de membresía.
