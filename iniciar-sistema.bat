@echo off
chcp 65001 >nul
REM ==========================================
REM  Iniciar Sistema Control Gym
REM  Este archivo levanta el backend y el
REM  frontend, y abre el navegador solo.
REM ==========================================

set RAIZ=D:\OLIMPO´S\gimnasio-sistema

echo Iniciando backend...
start "Control Gym - Backend" cmd /k "chcp 65001 >nul && cd /d %RAIZ%\backend && set PYTHONPATH=%RAIZ% && venv\Scripts\activate && uvicorn app.main:app --reload"

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
