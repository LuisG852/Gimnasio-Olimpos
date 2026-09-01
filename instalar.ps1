# ============================================================
#  Instalador de Control Gym (Olimpo's Gym)
#  Instalación limpia en una computadora NUEVA.
#
#  Mantiene la lógica original y agrega:
#   - Actualización correcta de pip dentro del venv.
#   - Instalación explícita de psycopg (driver usado por SQLAlchemy).
#   - Instalación de bcrypt.
#   - Instalación de PyJWT.
#   - Instalación de reportlab.
#   - Verificación de imports de las dependencias críticas.
#   - Verificación de errores de comandos externos.
#   - Alembic se ejecuta desde C:\ControlGym\database (o la carpeta
#     database correspondiente al destino elegido).
#   - El instalador NO muestra "¡Listo!" si un paso crítico falla.
# ============================================================

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Si algo revienta en cualquier parte de abajo, esto lo agarra y muestra
# un mensaje entendible en vez de una pila de errores de PowerShell, y
# deja la ventana abierta para que se pueda leer antes de cerrarla.
trap {
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Red
    Write-Host " ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "===================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "La instalación se detuvo. Revisá el mensaje de arriba,"
    Write-Host "corregí lo que haga falta y volvé a correr el instalador."
    Write-Host ""
    Read-Host "Presioná Enter para cerrar"
    exit 1
}

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

function Ejecutar-Comando {
    param(
        [Parameter(Mandatory=$true)][string]$Programa,
        [Parameter(Mandatory=$false)][string[]]$Argumentos = @(),
        [Parameter(Mandatory=$true)][string]$Descripcion
    )

    Write-Host $Descripcion
    & $Programa @Argumentos

    if ($LASTEXITCODE -ne 0) {
        throw "El comando falló con código $LASTEXITCODE : $Programa $($Argumentos -join ' ')"
    }
}

function Verificar-Import {
    param(
        [Parameter(Mandatory=$true)][string]$PythonExe,
        [Parameter(Mandatory=$true)][string]$Modulo,
        [Parameter(Mandatory=$true)][string]$Nombre
    )

    Write-Host "Verificando $Nombre..."
    & $PythonExe -c "import $Modulo; print('$Nombre OK')"

    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo importar $Modulo. La instalación de $Nombre no quedó correcta."
    }
}

Titulo "Instalador de Control Gym"
Write-Host "Este proceso tarda varios minutos. No cierres esta ventana."

# ------------------------------------------------------------
# 1) Python, Node.js y Git
# ------------------------------------------------------------
Titulo "Paso 1 de 8 - Programas necesarios"

$faltaAlgo = $false
$necesitaWinget = -not (Comando-Existe "python") -or -not (Comando-Existe "node") -or -not (Comando-Existe "git")

if ($necesitaWinget -and -not (Comando-Existe "winget")) {
    throw "Falta instalar Python, Node o Git, y esta computadora no tiene 'winget'. " +
          "Instalá 'Instalador de aplicaciones' desde la Microsoft Store, o instalá " +
          "Python, Node.js y Git manualmente, y volvé a correr este instalador."
}

if (-not (Comando-Existe "python")) {
    Write-Host "No se encontró Python. Instalando Python 3.11..."
    Ejecutar-Comando "winget" @(
        "install", "--id", "Python.Python.3.11", "-e", "--source", "winget",
        "--accept-package-agreements", "--accept-source-agreements"
    ) "Instalando Python 3.11..."
    $faltaAlgo = $true
} else {
    Write-Host "Python encontrado: $(python --version)"
}

if (-not (Comando-Existe "node")) {
    Write-Host "No se encontró Node.js. Instalando Node.js (LTS)..."
    Ejecutar-Comando "winget" @(
        "install", "--id", "OpenJS.NodeJS.LTS", "-e", "--source", "winget",
        "--accept-package-agreements", "--accept-source-agreements"
    ) "Instalando Node.js LTS..."
    $faltaAlgo = $true
} else {
    Write-Host "Node.js encontrado: $(node --version)"
}

if (-not (Comando-Existe "git")) {
    Write-Host "No se encontró Git. Instalando Git..."
    Ejecutar-Comando "winget" @(
        "install", "--id", "Git.Git", "-e", "--source", "winget",
        "--accept-package-agreements", "--accept-source-agreements"
    ) "Instalando Git..."
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
Write-Host "Este instalador NO instala PostgreSQL por vos - hay que instalarlo"
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
    $carpetaPostgres = Read-Host "No encontré PostgreSQL solo. Escribí la ruta a su carpeta 'bin' (ej: C:\Program Files\PostgreSQL\17\bin)"
}

if (-not (Test-Path "$carpetaPostgres\psql.exe")) {
    throw "No encontré psql.exe en: $carpetaPostgres"
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

try {
    $existe = & "$carpetaPostgres\psql.exe" -U $pgUsuario -h localhost -p $pgPuerto -tAc "SELECT 1 FROM pg_database WHERE datname='$pgBaseDatos'" postgres 2>$null

    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo conectar a PostgreSQL. Verificá usuario, contraseña, puerto y que el servicio esté iniciado."
    }

    if ($existe -eq "1") {
        Write-Host "La base de datos '$pgBaseDatos' ya existe - no se toca ni se borra nada."
    } else {
        Write-Host "Creando la base de datos '$pgBaseDatos'..."
        Ejecutar-Comando "$carpetaPostgres\psql.exe" @(
            "-U", $pgUsuario, "-h", "localhost", "-p", $pgPuerto,
            "-c", "CREATE DATABASE `"$pgBaseDatos`"" , "postgres"
        ) "Creando base de datos..."
    }
}
finally {
    # No dejamos la contraseña de PostgreSQL en la variable de entorno
    # más tiempo del necesario.
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
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

$tempClone = Join-Path $destino "_temp_clone"

if (Test-Path $tempClone) {
    Remove-Item $tempClone -Recurse -Force
}

Write-Host ""
Write-Host "Descargando el sistema desde GitHub..."
Write-Host "(Puede abrirse el navegador pidiendo iniciar sesión en GitHub - es normal.)"

Ejecutar-Comando "git" @(
    "clone", "https://github.com/LuisG852/Gimnasio-Olimpos.git", $tempClone
) "Clonando repositorio..."

Get-ChildItem $tempClone -Force | Move-Item -Destination $destino -Force
Remove-Item $tempClone -Recurse -Force

# ------------------------------------------------------------
# 5) Backend: entorno virtual + TODAS las librerías
# ------------------------------------------------------------
Titulo "Paso 5 de 8 - Preparando el backend"

$backend = Join-Path $destino "backend"
$venvPython = Join-Path $backend "venv\Scripts\python.exe"

Push-Location $backend
try {
    Write-Host "Creando entorno virtual..."
    Ejecutar-Comando "python" @("-m", "venv", "venv") "Creando entorno virtual..."

    if (-not (Test-Path $venvPython)) {
        throw "No se encontró el Python del entorno virtual en $venvPython"
    }

    # IMPORTANTE:
    # No usamos .\venv\Scripts\pip.exe para actualizar pip.
    # Usamos el propio Python del venv con -m pip, que evita el
    # error de actualización que apareció en la instalación anterior.
    Ejecutar-Comando $venvPython @("-m", "pip", "install", "--upgrade", "pip") `
        "Actualizando pip dentro del entorno virtual..."

    Write-Host "Instalando dependencias del requirements.txt..."
    Ejecutar-Comando $venvPython @("-m", "pip", "install", "-r", "requirements.txt") `
        "Instalando requirements.txt..."

    Write-Host ""
    Write-Host "Instalando dependencias adicionales requeridas por Control Gym..."
    Write-Host "  - psycopg[binary] (driver PostgreSQL usado por SQLAlchemy)"
    Write-Host "  - bcrypt"
    Write-Host "  - PyJWT"
    Write-Host "  - reportlab"

    Ejecutar-Comando $venvPython @(
        "-m", "pip", "install",
        "psycopg[binary]",
        "bcrypt",
        "PyJWT",
        "reportlab"
    ) "Instalando psycopg, bcrypt, PyJWT y reportlab..."

    Write-Host ""
    Write-Host "Verificando dependencias críticas..."

    Verificar-Import $venvPython "psycopg" "psycopg"
    Verificar-Import $venvPython "bcrypt" "bcrypt"
    Verificar-Import $venvPython "jwt" "PyJWT"
    Verificar-Import $venvPython "reportlab" "ReportLab"

    Write-Host ""
    Write-Host "Dependencias críticas verificadas correctamente."
}
finally {
    Pop-Location
}

# ------------------------------------------------------------
# 6) Frontend: librerías de Node
# ------------------------------------------------------------
Titulo "Paso 6 de 8 - Preparando el frontend"

$frontend = Join-Path $destino "frontend"

Push-Location $frontend
try {
    Ejecutar-Comando "npm" @("install") "Instalando dependencias del frontend..."
}
finally {
    Pop-Location
}

# ------------------------------------------------------------
# 7) Armar el .env
# ------------------------------------------------------------
Titulo "Paso 7 de 8 - Configuración (.env)"

Push-Location $backend
try {
    $secretKey = & $venvPython -c "import secrets; print(secrets.token_hex(32))"
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($secretKey)) {
        throw "No se pudo generar SECRET_KEY."
    }
}
finally {
    Pop-Location
}

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

Set-Content -Path "$backend\.env" -Value $contenidoEnv -Encoding UTF8
Write-Host "Archivo .env creado."

# ------------------------------------------------------------
# 8) Migraciones + acceso directo
# ------------------------------------------------------------
Titulo "Paso 8 de 8 - Tablas y acceso directo"

$database = Join-Path $destino "database"
$alembicExe = Join-Path $backend "venv\Scripts\alembic.exe"

if (-not (Test-Path $database)) {
    throw "No existe la carpeta database en: $database"
}

if (-not (Test-Path $alembicExe)) {
    throw "No se encontró Alembic en: $alembicExe"
}

Write-Host "Creando las tablas en la base de datos..."
Write-Host "Directorio de Alembic: $database"

# Se conserva expresamente la lógica original:
# Alembic vive en C:\ControlGym\database (o database bajo el destino elegido).
Push-Location $database
try {
    Ejecutar-Comando $alembicExe @("upgrade", "head") "Ejecutando migraciones de Alembic..."
}
finally {
    Pop-Location
}

Write-Host "Migraciones completadas correctamente."

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
