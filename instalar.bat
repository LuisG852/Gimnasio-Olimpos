@echo off
chcp 65001 >nul
REM Instalador de Control Gym para una computadora nueva.
REM Corre el script de PowerShell que hace todo el trabajo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"

pause
