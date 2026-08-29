# ============================================================
#  Instalador de Control Gym (Olimpo's Gym)
#  Para correr en una computadora NUEVA que todavía no tiene
#  nada del sistema instalado.
#
#  Qué hace, en orden:
#   1. Revisa/instala Python, Node.js y Git (con winget).
#   2. Pide confirmar que PostgreSQL ya está instalado (eso NO
#      lo instala este script — hay que hacerlo a mano primero).
#   3. Pide los datos de conexión a PostgreSQL y crea la base
#      de datos si todavía no existe.
#   4. Pregunta dónde instalar el sistema, y lo descarga desde
#      GitHub.
#   5. Prepara el backend (entorno virtual + librerías) y el
#      frontend (librerías de Node).
#   6. Arma el archivo .env con todos los datos.
#   7. Crea las tablas de la base de datos (migraciones).
#   8. Crea el acceso directo del escritorio con el logo.
# ============================================================

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.Encoding]::UTF8

function Titulo($texto) {
    Write-Host ""
    Write-Host "==================================================="
    Write-Host " $texto"
    Write-Host "==================================================="
}

function Comando-Existe($nombre) {
    return $null -ne (Get-Command $nombre -ErrorAction SilentlyContinue)
}

function Preguntar($texto, $porDefecto) {
    $respuesta = Read-Host "$texto (Enter para '$porDefecto')"
    if ([string]::IsNullOrWhiteSpace($respuesta)) { return $porDefecto }
    return $respuesta
}

Titulo "Instalador de Control Gym"
Write-Host "Este proceso tarda varios minutos. No cierres esta ventana."

# ------------------------------------------------------------
# 1) Python, Node.js y Git
# ------------------------------------------------------------
Titulo "Paso 1 de 8 - Programas necesarios"

$faltaAlgo = $false

if (-not (Comando-Existe "python")) {
    Write-Host "No se encontró Python. Instalando Python 3.11..."
    winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements
    $faltaAlgo = $true
} else {
    Write-Host "Python encontrado: $(python --version)"
}

if (-not (Comando-Existe "node")) {
    Write-Host "No se encontró Node.js. Instalando Node.js (LTS)..."
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    $faltaAlgo = $true
} else {
    Write-Host "Node.js encontrado: $(node --version)"
}

if (-not (Comando-Existe "git")) {
    Write-Host "No se encontró Git. Instalando Git..."
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    $faltaAlgo = $true
} else {
    Write-Host "Git encontrado: $(git --version)"
}

if ($faltaAlgo) {
    Write-Host ""
    Write-Host "Se instalaron programas nuevos. Windows necesita una terminal"
    Write-Host "NUEVA para reconocerlos (esta ventana ya no sirve para eso)."
    Write-Host ""
    Write-Host "Cerrá esta ventana, abrí una terminal nueva de PowerShell, y"
    Write-Host "volvé a correr este mismo instalador desde ahí."
    Read-Host "Presioná Enter para cerrar"
    exit
}

# ------------------------------------------------------------
# 2) PostgreSQL (no se instala solo, es manual a propósito)
# ------------------------------------------------------------
Titulo "Paso 2 de 8 - PostgreSQL"
Write-Host "Este instalador NO instala PostgreSQL por vos — hay que instalarlo"
Write-Host "a mano primero, con el instalador oficial:"
Write-Host "  https://www.postgresql.org/download/windows/"
Write-Host ""
$pgListo = Preguntar "¿Ya tenés PostgreSQL instalado y corriendo? (s/n)" "n"
if ($pgListo -ne "s") {
    Write-Host ""
    Write-Host "Instalá PostgreSQL primero, y después volvé a correr este instalador."
    Read-Host "Presioná Enter para cerrar"
    exit
}

$carpetaPostgres = $null
$posibles = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
if ($posibles) {
    $intento = Join-Path $posibles[0].FullName "bin"
    if (Test-Path "$intento\psql.exe") { $carpetaPostgres = $intento }
}
if (-not $carpetaPostgres) {
    $carpetaPostgres = Read-Host "No encontré PostgreSQL solo. Escribí la ruta a su carpeta 'bin' (ej: C:\Program Files\PostgreSQL\16\bin)"
}
Write-Host "Usando PostgreSQL en: $carpetaPostgres"

# ------------------------------------------------------------
# 3) Datos de conexión + crear la base de datos
# ------------------------------------------------------------
Titulo "Paso 3 de 8 - Base de datos"

$pgUsuario = Preguntar "Usuario de PostgreSQL" "postgres"
$pgPassword = Read-Host "Contraseña de PostgreSQL"
$pgPuerto = Preguntar "Puerto de PostgreSQL" "5432"
$pgBaseDatos = Preguntar "Nombre para la base de datos" "gimnasio"

$env:PGPASSWORD = $pgPassword
$existe = & "$carpetaPostgres\psql.exe" -U $pgUsuario -h localhost -p $pgPuerto -tAc "SELECT 1 FROM pg_database WHERE datname='$pgBaseDatos'" postgres 2>$null

if ($existe -eq "1") {
    Write-Host "La base de datos '$pgBaseDatos' ya existe — no se toca ni se borra nada."
} else {
    Write-Host "Creando la base de datos '$pgBaseDatos'..."
    & "$carpetaPostgres\psql.exe" -U $pgUsuario -h localhost -p $pgPuerto -c "CREATE DATABASE $pgBaseDatos" postgres
}

# ------------------------------------------------------------
# 4) Dónde instalar y descarga desde GitHub
# ------------------------------------------------------------
Titulo "Paso 4 de 8 - Descargar el sistema"

Write-Host "Recomendación: evitá acentos, apóstrofes o símbolos raros en la"
Write-Host "ruta de instalación (ya tuvimos problemas con eso antes)."
$destino = Preguntar "¿En qué carpeta instalar el sistema?" "C:\ControlGym"

if (Test-Path $destino) {
    Write-Host ""
    Write-Host "Esa carpeta ya existe."
    Write-Host "Si ya tenés el sistema instalado ahí, cancelá esto (Ctrl+C) y"
    Write-Host "actualizá con 'git pull' en vez de reinstalar todo de cero."
    $seguir = Preguntar "¿Seguir de todas formas?" "n"
    if ($seguir -ne "s") { exit }
} else {
    New-Item -ItemType Directory -Path $destino | Out-Null
}

Write-Host ""
Write-Host "Descargando el sistema desde GitHub..."
Write-Host "(Puede abrirse el navegador pidiendo iniciar sesión en GitHub — es normal.)"
git clone https://github.com/LuisG852/Gimnasio-Olimpos.git "$destino\_temp_clone"
Get-ChildItem "$destino\_temp_clone" -Force | Move-Item -Destination $destino -Force
Remove-Item "$destino\_temp_clone" -Recurse -Force

# ------------------------------------------------------------
# 5) Backend: entorno virtual + librerías
# ------------------------------------------------------------
Titulo "Paso 5 de 8 - Preparando el backend"
Push-Location "$destino\backend"
python -m venv venv
& ".\venv\Scripts\pip.exe" install --upgrade pip
& ".\venv\Scripts\pip.exe" install -r requirements.txt
Pop-Location

# ------------------------------------------------------------
# 6) Frontend: librerías de Node
# ------------------------------------------------------------
Titulo "Paso 6 de 8 - Preparando el frontend"
Push-Location "$destino\frontend"
npm install
Pop-Location

# ------------------------------------------------------------
# 7) Armar el .env
# ------------------------------------------------------------
Titulo "Paso 7 de 8 - Configuración (.env)"

Push-Location "$destino\backend"
$secretKey = & ".\venv\Scripts\python.exe" -c "import secrets; print(secrets.token_hex(32))"
Pop-Location

Write-Host ""
Write-Host "--- Correos automáticos (opcional, se puede configurar después) ---"
$brevoKey = Preguntar "API Key de Brevo" ""
$brevoEmail = Preguntar "Correo remitente verificado en Brevo" ""
$nombreGym = Preguntar "Nombre del gimnasio (para los correos)" "Olimpo's Gym"
$logoUrl = Preguntar "URL pública del logo (ej. de postimages.org)" ""

$contenidoEnv = @"
DEBUG=True
DATABASE_URL=postgresql+psycopg://${pgUsuario}:${pgPassword}@localhost:${pgPuerto}/${pgBaseDatos}

SECRET_KEY=$secretKey

BREVO_API_KEY=$brevoKey
BREVO_REMITENTE_EMAIL=$brevoEmail
BREVO_REMITENTE_NOMBRE=$nombreGym
GYM_NOMBRE=$nombreGym
DIAS_AVISO_VENCIMIENTO=3
GYM_LOGO_URL=$logoUrl

BACKUP_DIR=
BACKUP_DIAS_RETENCION=30
PG_DUMP_PATH=$carpetaPostgres\pg_dump.exe
PSQL_PATH=$carpetaPostgres\psql.exe
"@
Set-Content -Path "$destino\backend\.env" -Value $contenidoEnv -Encoding UTF8
Write-Host "Archivo .env creado."

# ------------------------------------------------------------
# 8) Migraciones + acceso directo
# ------------------------------------------------------------
Titulo "Paso 8 de 8 - Tablas y acceso directo"

Write-Host "Creando las tablas en la base de datos..."
Push-Location "$destino\database"
& "$destino\backend\venv\Scripts\alembic.exe" upgrade head
Pop-Location

Write-Host "Creando el acceso directo del escritorio..."
$escritorio = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$directo = $shell.CreateShortcut("$escritorio\Control Gym.lnk")
$directo.TargetPath = "$destino\iniciar-sistema.bat"
$directo.WorkingDirectory = $destino
$directo.IconLocation = "$destino\olimpos-gym.ico"
$directo.Description = "Abrir el sistema de $nombreGym"
$directo.Save()

Titulo "¡Listo!"
Write-Host "El sistema quedó instalado en: $destino"
Write-Host "Abrilo con el ícono 'Control Gym' que quedó en el escritorio."
Write-Host "La primera vez, va a pedir crear la cuenta de administrador."
Write-Host ""
Read-Host "Presioná Enter para cerrar"
