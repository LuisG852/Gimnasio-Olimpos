@echo off
chcp 65001 >nul
REM Crea el acceso directo del sistema en el escritorio, con el logo
REM de Olimpo's Gym como icono. Se corre UNA sola vez.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0crear-acceso-directo.ps1"

pause
