# RAS Company Rotas — Mapa e navegação de visitantes (V4)

**Ambiente local, Windows 10/11, Node.js >=20, Google Maps JavaScript API.** Esta versão preserva a estrutura de dados da V3 e atualiza **as duas interfaces**: painel de configuração e link público para visitante. Não altera ERPDesktop, Intranet RAS, MySQL, API Cloud, Render ou GitHub.

## Funcionalidades entregues

- Identidade RAS Company com símbolo original verde-escuro `#253C27` e dourado `#F4A62A`, favicon e QR Code/placa com logo.
- Cadastro protegido por senha local: unidades, pontos (balança, fábrica, escritório, barreiras etc.), coordenadas, descrições, status, ordem e ponto de origem.
- Caminhos internos: selecionar destino, clicar curva a curva no Google Maps, arrastar marcadores numerados, **inserir curvas entre pontos**, remover, desfazer, recomeçar e salvar. Origem/destino vêm dos pontos cadastrados. Cada destino tem seu próprio caminho.
- Link visitante com layout adaptado para celular, Google Maps híbrido/satélite, seleção de destino, posição GPS azul, linha verde restante, linha cinza completa, status, distância restante e tempo aproximado (carro até 15 km/h ou caminhada 4,5 km/h, simples estimativa, sem tráfego).
- GPS com `watchPosition`, quando em contexto seguro HTTPS e após permissão do visitante. Centro acompanha posição ao clicar **Iniciar navegação**. Se GPS estiver longe da rota, **não cria conexão fictícia pelas estradas**.
- QR Code próprio por unidade, com link que não muda quando altera locais ou rotas. O link do Quick Tunnel muda **quando o tunnel reinicia** (não imprimir para uso real).
- **Teste HTTPS no celular**: script 05 levanta um servidor secundário local que publica somente a tela de visitante, e usa Cloudflare Quick Tunnel temporário. A API administrativa e o Vite de desenvolvimento não ficam expostos por esse script.
- Dados permanecem no arquivo local `api/data/mapa-visitantes.json`. A chave fica em `web/.env.local` e a senha em `api/.env`, ignorados pelo Git.

## ATUALIZAR V3 -> V4 SEM PERDER CADASTROS

1. Pare a janela do script V3 pressionando `Ctrl+C`.
2. Baixe o ZIP `RAS_COMPANY_ROTAS_V4_GOOGLE_MAPS.zip` para Downloads.
3. Execute **no PowerShell** (gera backup da V3 antes de atualizar):

```powershell
$zip = "$env:USERPROFILE\Downloads\RAS_COMPANY_ROTAS_V4_GOOGLE_MAPS.zip"
$dest = 'C:\RAS\mapa-visitantes-ras'
$backup = "C:\RAS\backup-rotas-$(Get-Date -Format yyyyMMdd-HHmmss)"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
if (Test-Path "$dest\api\data") { Copy-Item "$dest\api\data" "$backup\data" -Recurse -Force }
if (Test-Path "$dest\api\.env") { Copy-Item "$dest\api\.env" "$backup\api.env" -Force }
if (Test-Path "$dest\web\.env.local") { Copy-Item "$dest\web\.env.local" "$backup\web.env.local" -Force }
Expand-Archive -LiteralPath $zip -DestinationPath 'C:\RAS' -Force
& "$dest\01_INICIAR_WINDOWS.ps1"
```

A V4 NÃO inclui `api/.env`, `web/.env.local`, nem o JSON local. O `Expand-Archive -Force` substitui o código mas **mantém os dados e credenciais existentes**. A pasta de backup também fica preservada.

## PRIMEIRA INSTALAÇÃO (se não tiver V3)

```powershell
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\RAS_COMPANY_ROTAS_V4_GOOGLE_MAPS.zip" -DestinationPath 'C:\RAS' -Force
& 'C:\RAS\mapa-visitantes-ras\01_INICIAR_WINDOWS.ps1'
```

Primeira execução solicita senha do cadastro e chave Google Maps, instala dependências npm e inicia API + site local.

## Usando o painel local

**Endereço:** `http://localhost:5173/admin`

1. **Unidades**: cadastre fazenda e coordenadas aproximadas do centro do mapa.
2. **Locais no mapa**: cadastre a balança como **ponto inicial** e exiba para visitantes. Depois cadastre fábrica, escritório, barreiras, demais pontos.
3. **Caminhos internos**: escolha destino; abra Google Maps satélite; modo **Desenhar**; clique na estrada perto da balança, nas curvas e cruzamentos, terminando próximo ao local escolhido. O sistema fixa a balança e destino como extremos, e conecta os pontos intermediários em ordem. **Arraste os círculos numerados** para corrigir. **Inserir curva** permite clicar no trecho desenhado e colocar mais um vértice no meio. Clique **Salvar e publicar caminho**. Não precisa desenhar polígono fechado.
4. **QR Code e link**: escolha a URL base, copie o link ou baixe o QR Code PNG. Sempre teste a rota pública antes de imprimir.

## TESTAR GPS NO CELULAR COM HTTPS SEM PUBLICAR NO RENDER

O celular **não consegue usar GPS de página HTTP em IP privado** como `http://192.168.201.225:5173` (exigência do navegador). A V4 inclui um teste HTTPS temporário.

A. Instale **cloudflared** uma vez, usando PowerShell (winget):

```powershell
winget install -e --id Cloudflare.cloudflared
```

Se necessário, feche/reabra o PowerShell para reconhecer `cloudflared`.

B. Deixe o primeiro PowerShell **com o script 01 aberto**. Abra OUTRO PowerShell e execute:

```powershell
& 'C:\RAS\mapa-visitantes-ras\05_GPS_CELULAR_HTTPS_WINDOWS.ps1'
```

O script 05 compila o React, abre a prévia pública local (`127.0.0.1:4174`) e imprime um domínio aleatório `https://NOME.trycloudflare.com`. Ele não aceita cadastro, edição, nem envia sua senha administrativa. A prévia usa a API local em leitura, que precisa continuar iniciada pelo script 01.

C. Configure sua **chave Google Maps** para aceitar o **domínio HTTPS exato** que apareceu. Em Google Cloud Console → Credenciais → Restrições do aplicativo → Referenciadores HTTP, deixe `http://localhost:5173/*` e acrescente `https://NOME.trycloudflare.com/*`; limite as APIs à **Maps JavaScript API**. Não precisa fornecer a chave para ninguém. Esta URL muda ao reiniciar o túnel.

D. No painel admin local → **QR Code e link** → **Endereço base do site**, cole apenas `https://NOME.trycloudflare.com` (sem `/v/...`, sem barra no final). O sistema monta `https://NOME.trycloudflare.com/v/slug-da-unidade` e o QR Code automaticamente. Abra pelo celular com internet, autorize o GPS e escolha o destino.

E. Quando encerrar, pressione `Ctrl+C` no PowerShell do script 05. O link público termina. **Este é um túnel temporário apenas para testes, nunca para QR Code definitivo**. Quando aprovar o projeto, publicar no Render com HTTPS e domínio estável.

Aviso: qualquer pessoa com esse URL temporário consegue ver os locais e rotas **ativos**. Não publique trajetos sensíveis ou restritos durante testes. A API de configuração não é publicada pelo script 05. O GPS é processado localmente no navegador, sem ser enviado à API.

## Scripts

| Arquivo | O que faz |
|---|---|
| `01_INICIAR_WINDOWS.ps1` | Configura senha/chave se necessário, instala npm e inicia painel/API |
| `02_COMPILAR_WINDOWS.ps1` | Compila frontend para futura publicação |
| `03_VERIFICAR_LOCAL_WINDOWS.ps1` | Verifica se API e site respondem |
| `04_CONFIGURAR_GOOGLE_MAPS_WINDOWS.ps1` | Trocar chave e Map ID no arquivo local |
| `05_GPS_CELULAR_HTTPS_WINDOWS.ps1` | Preview de leitura + HTTPS temporário via Cloudflare |

## URLs e armazenamento

- Painel local: `http://localhost:5173/admin`
- Página visitante local: `http://localhost:5173/v/SLUG`
- API local: `http://127.0.0.1:4000/api/health`
- Preview HTTPS: domínio gerado pelo script 05, rota `/v/SLUG`
- Arquivo de cadastro: `api/data/mapa-visitantes.json`
- Chave do Google: `web/.env.local` (não publicar)
- Senha: `api/.env` (não publicar)

## Observações importantes

- **Não é navegação turn-by-turn com comando de voz**. O sistema exibe o traçado interno desenhado e destaca o que falta quando o GPS está próximo da linha. Você define as ruas e curvas reais.
- Os caminhos podem ter até 300 pontos intermediários. Vias não são calculadas automaticamente pelo Google Directions ou Google Roads.
- A posição do GPS pode variar bastante em áreas com galpões/estruturas. Se o visitante estiver longe do desenho ou com precisão baixa, mostramos avisos sem inventar atalhos.
- Tempo estimado é puramente matemático por velocidade de referência, sem considerar tráfego, porteiras ou condições reais.
- Para uso definitivo com Render, usar uma API persistente e autenticação corporativa adequada, domínio fixo e restrições da chave. Não publique diretamente esta API local com senha única/JSON em produção.
- Google Maps requer projeto Google Cloud com faturamento habilitado e API Maps JavaScript ativa. Para marcadores avançados, esta V4 usa `DEMO_MAP_ID` durante testes; antes da produção configure seu Map ID próprio.
- `npm run check` executa check do servidor, testes de geometria GPS e compilação do frontend.

## Publicacao no Render (V4.2)

Para publicar o site publico do visitante com HTTPS e importar somente os locais ativos, consulte **`README_RENDER.md`**. Primeiro execute `08_PREPARAR_RENDER_WINDOWS.ps1` no computador que tem os dados reais. **Nao envie `api/data/mapa-visitantes.json` nem arquivos `.env` para GitHub.**
