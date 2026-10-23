# Execute no PowerShell em uma maquina Windows com Node.js >= 20 instalado.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

Write-Host ''
Write-Host '===================================================' -ForegroundColor DarkGreen
Write-Host '  RAS - RAS COMPANY ROTAS / VISITANTES - V4 LOCAL' -ForegroundColor Green
Write-Host '===================================================' -ForegroundColor DarkGreen

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js nao encontrado. Instale Node.js 20+ antes de continuar.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm nao encontrado. Reinstale o Node.js incluindo npm.' }
$major = [int]((node -v).TrimStart('v').Split('.')[0])
if ($major -lt 20) { throw 'E necessario Node.js versao 20 ou superior.' }

$envFile = Join-Path $PSScriptRoot 'api\.env'
if (-not (Test-Path -LiteralPath $envFile)) {
  Write-Host ''
  Write-Host 'Primeiro uso: crie uma senha para o CADASTRO administrativo.' -ForegroundColor Yellow
  $secure = Read-Host 'Digite uma senha com pelo menos 8 caracteres' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  if ([string]::IsNullOrWhiteSpace($plain) -or $plain.Length -lt 8) { throw 'A senha deve ter pelo menos 8 caracteres. Execute o script novamente.' }
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($plain))
  $contents = "PORT=4000`nHOST=127.0.0.1`nADMIN_PASSWORD_B64=$b64`n"
  [IO.File]::WriteAllText($envFile, $contents, (New-Object Text.UTF8Encoding($false)))
  Remove-Variable plain, b64 -ErrorAction SilentlyContinue
  Write-Host 'Senha salva localmente em api\.env (nao enviar ao GitHub).' -ForegroundColor Green
}
# Configure a chave do navegador sem escreve-la no codigo ou no GitHub.
$googleEnv = Join-Path $PSScriptRoot 'web\.env.local'
if (-not (Test-Path -LiteralPath $googleEnv)) {
  Write-Host ''
  Write-Host 'Google Maps ainda nao configurado neste computador.' -ForegroundColor Yellow
  & (Join-Path $PSScriptRoot '04_CONFIGURAR_GOOGLE_MAPS_WINDOWS.ps1')
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'Falha na configuracao da chave Google Maps.' }
}
if (-not (Test-Path -LiteralPath $googleEnv)) { throw 'Crie web\.env.local para habilitar o Google Maps.' }
$googleEnvText = [IO.File]::ReadAllText($googleEnv)
if ($googleEnvText -notmatch '(?m)^VITE_GOOGLE_MAPS_API_KEY=.{20,}$' -or $googleEnvText -match 'VITE_GOOGLE_MAPS_API_KEY=SUA_CHAVE_AQUI') {
  throw 'A chave Google Maps nao esta valida em web\.env.local. Execute 04_CONFIGURAR_GOOGLE_MAPS_WINDOWS.ps1.'
}
Remove-Variable googleEnvText -ErrorAction SilentlyContinue
Write-Host ''
Write-Host "Node: $(node -v) | npm: $(npm -v)"
Write-Host 'Instalando / conferindo as dependencias...'
npm install
if ($LASTEXITCODE -ne 0) { throw 'Falha no npm install.' }

Write-Host ''
Write-Host 'PAINEL GOOGLE MAPS:     http://localhost:5173/admin' -ForegroundColor Green
Write-Host 'API LOCAL:             http://127.0.0.1:4000/api/health'
Write-Host 'No Google Cloud, autorize http://localhost:5173/* na API Key.' -ForegroundColor Yellow
Write-Host 'Para GPS no celular via HTTPS: deixe este PowerShell aberto e em OUTRO PowerShell execute:' -ForegroundColor Yellow
Write-Host '  05_GPS_CELULAR_HTTPS_WINDOWS.ps1' -ForegroundColor Cyan
Write-Host 'O script 05 usa uma visualizacao PUBLICA separada da administracao.' -ForegroundColor Yellow
Write-Host 'Deixe este PowerShell aberto. Para encerrar, pressione Ctrl+C.'
Write-Host ''
npm run dev
if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar os servidores.' }
