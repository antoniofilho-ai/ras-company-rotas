# Salva a chave Google Maps SOMENTE neste computador.
# Execute sempre que quiser cadastrar/trocar a chave.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

Write-Host ''
Write-Host '====================================================' -ForegroundColor DarkGreen
Write-Host ' RAS - CONFIGURAR GOOGLE MAPS (SOMENTE AMBIENTE LOCAL)' -ForegroundColor Green
Write-Host '====================================================' -ForegroundColor DarkGreen
Write-Host 'Use uma chave liberada para Maps JavaScript API.'
Write-Host 'Nao cole sua chave em conversas, prints ou arquivos do GitHub.' -ForegroundColor Yellow

$destino = Join-Path $PSScriptRoot 'web\.env.local'
if (Test-Path -LiteralPath $destino) {
  Write-Host 'Uma configuracao Google Maps ja existe em web\.env.local.' -ForegroundColor Yellow
  $continuar = Read-Host 'Deseja substituir a chave atual? [S/N]'
  if ($continuar -notin @('S', 's', 'SIM', 'Sim', 'sim')) {
    Write-Host 'Configuracao mantida.' -ForegroundColor Green
    exit 0
  }
}

$segredo = Read-Host 'Cole sua API Key do Google Maps (entrada oculta)' -AsSecureString
$buffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($segredo)
try { $chave = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer) }
$chave = $chave.Trim()
if ([string]::IsNullOrWhiteSpace($chave) -or $chave.Length -lt 20 -or $chave -match '[\s\r\n=]') {
  throw 'Formato de chave invalido. Confira a API Key do Google Cloud e execute novamente.'
}

$mapId = 'DEMO_MAP_ID'
$conteudo = "VITE_GOOGLE_MAPS_API_KEY=$chave`nVITE_GOOGLE_MAP_ID=$mapId`nVITE_GOOGLE_MAP_TYPE=hybrid`n"
[IO.File]::WriteAllText($destino, $conteudo, (New-Object Text.UTF8Encoding($false)))
Remove-Variable segredo, chave, conteudo -ErrorAction SilentlyContinue
Write-Host ''
Write-Host 'Google Maps configurado em web\.env.local.' -ForegroundColor Green
Write-Host 'O arquivo esta no .gitignore. Nunca publique a chave sem restricao de site e API.' -ForegroundColor Yellow
Write-Host 'Em producao, substitua DEMO_MAP_ID por um Map ID criado no Google Cloud.' -ForegroundColor Yellow
Write-Host 'Se o site estiver aberto, pressione Ctrl+C e execute 01_INICIAR_WINDOWS.ps1 novamente.' -ForegroundColor Cyan
