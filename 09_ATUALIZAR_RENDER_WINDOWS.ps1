# Apos primeiro push, exporta novos cadastros ativos e manda ao GitHub.
# Render deve estar conectado ao repositorio com auto-deploy habilitado.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
& (Join-Path $PSScriptRoot '08_PREPARAR_RENDER_WINDOWS.ps1')
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Instale o Git for Windows.' }
& git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) { throw 'O projeto ainda nao possui remote origin. Configure o GitHub antes de executar este script.' }
& git add -- web/public/public-data
if ($LASTEXITCODE -ne 0) { throw 'Falha no git add.' }
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Host 'Sem mudancas nos dados publicos para publicar.' -ForegroundColor Green; exit 0 }
& git commit -m ('Atualiza destinos e caminhos RAS ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
if ($LASTEXITCODE -ne 0) { throw 'Falha no git commit.' }
& git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Falha no push. Confira autenticacao GitHub, conexao e branch.' }
Write-Host 'Push concluido: Render devera iniciar um novo deploy automaticamente.' -ForegroundColor Green
