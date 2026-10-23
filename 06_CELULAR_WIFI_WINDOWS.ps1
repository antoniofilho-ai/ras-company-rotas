# RAS Company Rotas V4.1 - TESTE do mapa PUBLICO no celular por Wi-Fi.
# Por seguranca, a API admin e o Vite permanecem acessiveis apenas via localhost.
param([string]$IP = '192.168.201.225')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host ''
Write-Host '=======================================================' -ForegroundColor DarkGreen
Write-Host ' RAS COMPANY ROTAS - VISITANTES NO CELULAR - WIFI V4.1' -ForegroundColor Green
Write-Host '=======================================================' -ForegroundColor DarkGreen

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js nao encontrado.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm nao encontrado.' }
$ipAtual = Get-NetIPAddress -AddressFamily IPv4 -IPAddress $IP -ErrorAction SilentlyContinue
if (-not $ipAtual) {
  Write-Host "Nao encontrei $IP nos enderecos deste computador:" -ForegroundColor Red
  Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object InterfaceAlias, IPAddress | Format-Table -AutoSize
  throw 'Verifique o IPv4 correto. Exemplo: & .\06_CELULAR_WIFI_WINDOWS.ps1 -IP 192.168.201.225'
}
try {
  $api = Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/health' -TimeoutSec 5
  if (-not $api.ok) { throw 'health=false' }
} catch {
  throw 'API local nao respondeu. Em OUTRO PowerShell, rode 01_INICIAR_WINDOWS.ps1 e deixe aberto.'
}
Write-Host 'Configurando o Firewall para acesso LAN apenas a porta 4174...' -ForegroundColor Yellow
& (Join-Path $PSScriptRoot '07_LIBERAR_WIFI_FIREWALL_WINDOWS.ps1') -IP $IP
Write-Host ''
Write-Host 'Compilando a pagina publica do visitante...' -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Falha ao compilar a pagina. Confira a saida do npm.' }
$env:PREVIEW_HOST = '0.0.0.0'
$env:PREVIEW_PORT = '4174'
Write-Host ''
Write-Host "TESTE WIFI (visitantes): http://$($IP):4174" -ForegroundColor Green
Write-Host "LINK DE UM DESTINO:    http://$($IP):4174/v/SEU-SLUG" -ForegroundColor Green
Write-Host 'No painel admin: QR Code e link -> Endereco base do site -> cole apenas a URL acima, sem /v/... .' -ForegroundColor Yellow
Write-Host "No Google Cloud: autorize http://$($IP):4174/* para a chave Maps JavaScript API." -ForegroundColor Yellow
Write-Host 'O celular deve estar na MESMA rede local, sem Wi-Fi convidado ou isolamento de clientes.' -ForegroundColor Yellow
Write-Host 'GPS nao funciona por HTTP em IP privado. Para GPS, use script 05 (HTTPS Cloudflare) ou Render.' -ForegroundColor Yellow
Write-Host 'Deixe esta janela aberta e pressione Ctrl+C para encerrar.' -ForegroundColor Cyan
Write-Host ''
node (Join-Path $PSScriptRoot 'api\src\public-preview.js')
if ($LASTEXITCODE -ne 0) { throw 'Servidor de visitantes nao iniciou. Verifique se a porta 4174 ja esta sendo utilizada.' }
