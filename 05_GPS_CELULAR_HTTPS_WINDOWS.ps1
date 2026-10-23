# RAS Company Rotas V4. Cria endereco HTTPS temporario SOMENTE da tela publica do visitante.
# Nunca exponha Vite dev server (5173) ou API admin (4000) no tunnel.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host ''
Write-Host '===================================================' -ForegroundColor DarkGreen
Write-Host ' RAS COMPANY ROTAS - TESTE GPS CELULAR HTTPS - V4' -ForegroundColor Yellow
Write-Host '===================================================' -ForegroundColor DarkGreen
Write-Host 'A area administrativa NAO sera compartilhada.' -ForegroundColor Yellow

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host 'Cloudflared nao encontrado. Instale pelo Windows:' -ForegroundColor Yellow
  Write-Host '  winget install -e --id Cloudflare.cloudflared' -ForegroundColor Cyan
  Write-Host 'Feche e abra o PowerShell apos instalar. Depois execute este script.' -ForegroundColor Yellow
  throw 'Cloudflared nao instalado.'
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js nao localizado.' }
try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/health' -TimeoutSec 5
  if (-not $health.ok) { throw 'API nao respondeu OK.' }
} catch {
  throw 'Execute primeiro 01_INICIAR_WINDOWS.ps1 em OUTRO PowerShell e deixe-o aberto. A API local na porta 4000 nao respondeu.'
}
Write-Host 'Compilando pagina para visita publica...' -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Falha na compilacao. Execute npm install e confira os erros.' }
$entry = Join-Path $PSScriptRoot 'api\src\public-preview.js'
Write-Host 'Iniciando visualizacao publica restrita na porta 4174...' -ForegroundColor Green
$preview = Start-Process -FilePath (Get-Command node).Source -ArgumentList ('"' + $entry + '"') -WindowStyle Hidden -PassThru
try {
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 350
    try {
      $status = Invoke-RestMethod -Uri 'http://127.0.0.1:4174/api/health' -TimeoutSec 2
      if ($status.mode -eq 'visitor-read-only') { $ready = $true; break }
    } catch { }
  }
  if (-not $ready) { throw 'Preview nao iniciou na porta 4174. Confira se a porta esta livre.' }
  Write-Host ''
  Write-Host 'A seguir o Cloudflare mostrara um endereco https://...trycloudflare.com' -ForegroundColor Yellow
  Write-Host 'COPIE ESSE ENDERECO. No Google Cloud, autorize APENAS esse site na chave Maps JavaScript API.' -ForegroundColor Yellow
  Write-Host 'Na aba QR Code da administracao, cole esse endereco em "Endereco base do site".' -ForegroundColor Yellow
  Write-Host 'Testes apenas! Link muda a cada execucao e para de funcionar quando encerrar.' -ForegroundColor Yellow
  Write-Host 'Para parar o teste, pressione Ctrl+C neste PowerShell.' -ForegroundColor Yellow
  Write-Host ''
  cloudflared tunnel --url http://127.0.0.1:4174
} finally {
  if ($preview -and -not $preview.HasExited) {
    Stop-Process -Id $preview.Id -Force -ErrorAction SilentlyContinue
  }
}
