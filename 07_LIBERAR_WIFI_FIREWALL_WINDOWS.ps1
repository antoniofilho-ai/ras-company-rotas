# RAS Company Rotas V4.1 - Permite SOMENTE visitantes LAN na porta TCP 4174.
# A API administrativa 4000 e o editor 5173 continuam acessiveis so em localhost.
param([string]$IP = '192.168.201.225')
$ErrorActionPreference = 'Stop'

$ipAtual = Get-NetIPAddress -AddressFamily IPv4 -IPAddress $IP -ErrorAction SilentlyContinue
if (-not $ipAtual) {
  Write-Host "IP $IP nao foi encontrado neste computador. Enderecos disponiveis:" -ForegroundColor Red
  Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object InterfaceAlias, IPAddress | Format-Table -AutoSize
  throw "Confira o IPv4 da maquina e execute de novo com -IP endereco-correto."
}

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host 'Solicitando permissao do Windows para liberar a porta 4174 SOMENTE na rede local...' -ForegroundColor Yellow
  $argumentos = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -IP `"$IP`""
  $processo = Start-Process -FilePath 'powershell.exe' -ArgumentList $argumentos -Verb RunAs -Wait -PassThru
  if ($processo.ExitCode -ne 0) { throw 'O Firewall nao foi configurado. Execute este arquivo como Administrador.' }
  return
}

$nome = "RASCompanyVisitantes4174_$($IP.Replace('.','_'))"
$existente = Get-NetFirewallRule -Name $nome -ErrorAction SilentlyContinue
if (-not $existente) {
  New-NetFirewallRule -Name $nome -DisplayName "RAS Company - Visitantes 4174 ($IP)" `
    -Description 'Somente mapa publico de visitantes na rede local. Nao libera 4000 nem 5173.' `
    -Enabled True -Direction Inbound -Action Allow -Profile Any `
    -Protocol TCP -LocalPort 4174 -LocalAddress $IP -RemoteAddress LocalSubnet | Out-Null
  Write-Host "Firewall configurado para rede local: TCP $IP`:4174" -ForegroundColor Green
} else {
  Write-Host "Regra do Firewall ja existe para $IP`:4174." -ForegroundColor Green
}
Write-Host 'Acesso administrativo segue restrito ao proprio computador.' -ForegroundColor Green
