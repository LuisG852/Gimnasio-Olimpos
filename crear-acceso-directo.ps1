$ErrorActionPreference = "Stop"

$raiz = "D:\OLIMPO´S\gimnasio-sistema"
$escritorio = [Environment]::GetFolderPath('Desktop')

$shell = New-Object -ComObject WScript.Shell
$directo = $shell.CreateShortcut("$escritorio\Control Gym.lnk")
$directo.TargetPath = "$raiz\iniciar-sistema.bat"
$directo.WorkingDirectory = $raiz
$directo.IconLocation = "$raiz\olimpos-gym.ico"
$directo.Description = "Abrir el sistema de Olimpo's Gym"
$directo.Save()

Write-Host ""
Write-Host "Listo. Ya deberia aparecer un acceso directo llamado 'Control Gym' en tu escritorio, con el logo del gimnasio."
Write-Host ""
