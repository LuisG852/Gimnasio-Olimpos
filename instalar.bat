@echo off
chcp 65001 >nul
title Instalador de Control Gym
REM Instalador de Control Gym para una computadora nueva.
REM Corre el script de PowerShell que hace todo el trabajo.

where powershell >nul 2>nul
if errorlevel 1 (
    echo No se encontro PowerShell en esta computadora.
    echo Este instalador necesita Windows PowerShell para funcionar.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"

if errorlevel 1 (
    echo.
    echo ===================================================
    echo  La instalacion NO se completo. Revisa los mensajes de arriba.
    echo ===================================================
) else (
    echo.
    echo ===================================================
    echo  Instalacion finalizada.
    echo ===================================================
)

pause
