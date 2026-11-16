# Ejecuta un escenario de k6 con el web dashboard y guarda los reportes en reports\
#
# Uso (desde la carpeta del proyecto, en PowerShell):
#   .\run.ps1 smoke
#   .\run.ps1 carga
#   .\run.ps1 estres -e VUS_MAX=100
#
# Si Windows bloquea el script ("la ejecución de scripts está deshabilitada"):
#   powershell -ExecutionPolicy Bypass -File .\run.ps1 smoke

$pruebas = @('smoke', 'carga', 'spike', 'estres')
if ($args.Count -lt 1 -or $pruebas -notcontains $args[0]) {
  Write-Host "Uso: .\run.ps1 <smoke|carga|spike|estres> [opciones de k6, ej: -e VUS=30]" -ForegroundColor Yellow
  exit 1
}
$Prueba = $args[0]
$Extra = @()
if ($args.Count -gt 1) { $Extra = $args[1..($args.Count - 1)] }

$fecha = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force -Path reports | Out-Null

$env:K6_WEB_DASHBOARD = 'true'
$env:K6_WEB_DASHBOARD_OPEN = 'true'     # abre el navegador automáticamente
$env:K6_WEB_DASHBOARD_PERIOD = '5s'     # refresco de las gráficas
$env:K6_WEB_DASHBOARD_EXPORT = "reports/$Prueba-$fecha.html"

$k6Args = @('run', '--summary-export', "reports/$Prueba-$fecha-summary.json") + $Extra + @("scenarios/$Prueba.js")
Write-Host ">> k6 $($k6Args -join ' ')" -ForegroundColor Cyan
& k6 @k6Args

Write-Host "`nReportes en reports\$Prueba-$fecha.html y reports\$Prueba-$fecha-summary.json" -ForegroundColor Green
