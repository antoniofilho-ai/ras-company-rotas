$ErrorActionPreference = 'Stop'
Write-Host 'Verificando API local...'
try {
  $health = Invoke-RestMethod 'http://127.0.0.1:4000/api/health' -TimeoutSec 5
  $health | Format-List
} catch {
  Write-Host 'API nao esta online. Rode 01_INICIAR_WINDOWS.ps1 e mantenha a janela aberta.' -ForegroundColor Red
}
Write-Host ''
Write-Host 'Verificando tela local...'
try {
  $web = Invoke-WebRequest 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 5
  Write-Host "Site responde HTTP $($web.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host 'Tela nao esta online. Verifique o console do script 01.' -ForegroundColor Red
}

Write-Host ''
Write-Host 'Verificando configuracao Google Maps...'
$g = Join-Path $PSScriptRoot 'web\.env.local'
if (Test-Path $g) {
  Write-Host 'Chave configurada em arquivo local (nao exibida).' -ForegroundColor Green
} else {
  Write-Host 'Falta configurar web\.env.local. Rode o script 04.' -ForegroundColor Yellow
}
