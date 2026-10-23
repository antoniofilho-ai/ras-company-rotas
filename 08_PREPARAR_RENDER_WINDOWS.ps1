# Exporta os locais e caminhos ativos para um site estatico PUBLICO no Render.
# NAO publica o cadastro nem arquivos de senha ou a base interna completa.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host '=============================================' -ForegroundColor DarkGreen
Write-Host ' RAS COMPANY ROTAS - PREPARAR DADOS PARA RENDER' -ForegroundColor Green
Write-Host '=============================================' -ForegroundColor DarkGreen
$dados = Join-Path $PSScriptRoot 'api\data\mapa-visitantes.json'
if (-not (Test-Path -LiteralPath $dados)) { throw "Cadastros nao encontrados: $dados" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node nao encontrado no PATH.' }
$backup = Join-Path $PSScriptRoot ('backup-dados-publicacao-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.json')
Copy-Item -LiteralPath $dados -Destination $backup -Force
Write-Host "Backup do arquivo ORIGINAL: $backup" -ForegroundColor Cyan
& node (Join-Path $PSScriptRoot 'scripts\export-public.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Falha na exportacao. Nao envie arquivos ao GitHub antes de corrigir.' }
Write-Host ''
Write-Host 'PRONTO: arquivos publicos exportados em web\public\public-data.' -ForegroundColor Green
Write-Host 'ATENCAO: o backup ORIGINAL acima nao deve ir para o GitHub.' -ForegroundColor Yellow
Write-Host 'O arquivo de backup tem o prefixo backup-dados-publicacao- e esta ignorado pelo .gitignore.' -ForegroundColor Yellow
Write-Host 'Use Render Static Site com VITE_PUBLIC_STATIC=true e Publish Directory web/dist.' -ForegroundColor Cyan
