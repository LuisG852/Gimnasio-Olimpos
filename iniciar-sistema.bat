@echo off
chcp 65001 >nul
REM ==========================================
REM  Iniciar Sistema Control Gym
REM  Este archivo levanta el backend y el
REM  frontend, y abre el navegador solo.
REM ==========================================

set RAIZ=%~dp0
REM %~dp0 es la carpeta donde está este mismo archivo .bat — así el
REM sistema funciona sin importar en qué carpeta/computadora se instale,
REM en vez de depender de una ruta fija escrita a mano.
if "%RAIZ:~-1%"=="\" set RAIZ=%RAIZ:~0,-1%

echo Iniciando backend...
start "Control Gym - Backend" cmd /k "chcp 65001 >nul && cd /d %RAIZ%\backend && set PYTHONPATH=%RAIZ% && venv\Scripts\activate && uvicorn app.main:app --reload --reload-dir . --reload-dir ../database"

echo Esperando que el backend arranque...
timeout /t 5 /nobreak >nul

echo Iniciando frontend...
start "Control Gym - Frontend" cmd /k "chcp 65001 >nul && cd /d %RAIZ%\frontend && npm run dev"

echo Esperando que el frontend arranque...
timeout /t 5 /nobreak >nul

echo Abriendo el navegador...
start http://localhost:5173

echo.
echo Sistema iniciado. No cierres las 2 ventanas negras mientras lo uses.
echo Esta ventana se puede cerrar.
pause
