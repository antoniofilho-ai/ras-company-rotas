# Compila o site para futuro deploy; nao publica nada.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host 'Compilando o site RAS (React + Google Maps)...' -ForegroundColor Green
if (-not (Test-Path 'web\.env.local')) { throw 'Configure a chave primeiro: .\04_CONFIGURAR_GOOGLE_MAPS_WINDOWS.ps1' }
if (-not (Test-Path 'node_modules')) { npm install; if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependencias.' } }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Falha no build.' }
Write-Host ''
Write-Host 'Build pronto em web\dist' -ForegroundColor Green
Write-Host 'ATENCAO: Antes de publicar no Render, integrar API persistente e autenticacao ao backend existente.' -ForegroundColor Yellow
