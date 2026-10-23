# RAS Company Rotas V4.2 — Publicar mapa no Render por HTTPS

Esta é uma **publicação inicial segura e somente para visitantes**. O painel administrativo continua no seu Windows. Quando atualizar locais/caminhos, exporte novamente e envie a atualização ao GitHub. A V4.2 **não faz sincronização instantânea** com o Render.

## Por que esta opção?

- Render **Static Site** serve React, Google Maps e GPS por HTTPS, sem servidor Node permanentemente ativo.
- Os dados publicados ficam em `web/public/public-data/*.json` e são enviados junto com o código para o GitHub privado e publicados como arquivos do site (visíveis a qualquer visitante com o endereço).
- `api/data/mapa-visitantes.json`, `api/.env`, `web/.env.local` e backups continuam **somente no computador**, não no GitHub.
- As rotas da API administrativa não existem no site estático. Somente as unidades, locais e caminhos com status ativo são exportados.
- Para administrar e editar de qualquer lugar sem enviar commits, será necessário futuramente construir API autenticada + banco persistente, como Postgres.

## 1. Instalar V4.2 SEM perder dados

Execute no PowerShell:

```powershell
$zip = "$env:USERPROFILE\Downloads\RAS_COMPANY_ROTAS_V4_2_RENDER.zip"
$dest = "C:\RAS\mapa-visitantes-ras"
$backup = "C:\RAS\backup-rotas-v42-$(Get-Date -Format yyyyMMdd-HHmmss)"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item "$dest\api\data" "$backup\data" -Recurse -Force
if (Test-Path "$dest\api\.env") { Copy-Item "$dest\api\.env" "$backup\api.env" -Force }
if (Test-Path "$dest\web\.env.local") { Copy-Item "$dest\web\.env.local" "$backup\web.env.local" -Force }
Expand-Archive -LiteralPath $zip -DestinationPath "C:\RAS" -Force
& "$dest\08_PREPARAR_RENDER_WINDOWS.ps1"
```

O ZIP não contém seus arquivos `.env`, `.env.local` ou o JSON original. A atualização preserva esses arquivos na pasta local.

## 2. Conferir a exportação

```powershell
Get-Content "C:\RAS\mapa-visitantes-ras\web\public\public-data\units.json" -Raw | ConvertFrom-Json | Format-List
Get-ChildItem "C:\RAS\mapa-visitantes-ras\web\public\public-data" -Filter '*.json'
```

Confirme que existe `fazenda-maravilha.json`. O conteúdo publicado mostra apenas locais e trajetos ativos. **Revisar se os dados do mapa podem ser vistos por qualquer visitante com o link.**

## 3. Criar repositório PRIVADO no GitHub

Crie pelo site `https://github.com/new` o repositório **privado** `ras-company-rotas`, sem marcar "Add README".

Depois, com **Git for Windows** instalado, rode:

```powershell
cd 'C:\RAS\mapa-visitantes-ras'
git init
git branch -M main
git add .
git status --short
git commit -m 'RAS Company Rotas - publicacao inicial'
git remote add origin https://github.com/SEU_USUARIO/ras-company-rotas.git
git push -u origin main
```

Troque `SEU_USUARIO` por seu usuário/organização. Se já existir o remote `origin`, não execute `git remote add` outra vez; consulte `git remote -v`.

**Verifique `git status --short` antes de `git commit`:** seus arquivos `api/data/mapa-visitantes.json`, `api/.env`, `web/.env.local` e backups completos NÃO podem aparecer. O arquivo `web/public/public-data/fazenda-maravilha.json` deve aparecer, pois ele é o snapshot público.

## 4. Criar o Render Static Site

1. `https://dashboard.render.com` > **New** > **Static Site**.
2. Conecte o GitHub e selecione `ras-company-rotas`.
3. Name: `ras-company-rotas` (ou outro disponível).
4. Branch: `main`.
5. Root Directory: **em branco**.
6. Build Command: `npm install && npm run build`.
7. Publish Directory: `web/dist`.
8. Environment: defina estes valores:

| Chave | Valor |
|---|---|
| `VITE_PUBLIC_STATIC` | `true` |
| `VITE_GOOGLE_MAPS_API_KEY` | sua chave Google Maps (preencher no painel Render) |
| `VITE_GOOGLE_MAP_ID` | Map ID próprio para produção; temporariamente `DEMO_MAP_ID` para teste |
| `VITE_GOOGLE_MAP_TYPE` | `hybrid` |
| `NODE_VERSION` | `22` |

9. Clique em **Create Static Site**.
10. Na aba **Redirects/Rewrites**, configure: Source `/v/*`, Destination `/index.html`, Action `Rewrite`.

**NÃO coloque a chave em arquivo do GitHub.** A Maps JavaScript API funciona no navegador: a chave ficará visível ao cliente e deverá estar restrita a referenciadores HTTP/HTTPS autorizados e à própria API.

## 5. Liberar Google Maps para a URL nova

Google Cloud Console > APIs e serviços > Credenciais > sua chave Maps JavaScript API. Adicione o referenciador correto, por exemplo:

```
https://ras-company-rotas.onrender.com/*
```

Use a URL real retornada pelo Render, e restrinja a chave à **Maps JavaScript API**. Com a página pública HTTPS, o navegador poderá solicitar permissão de GPS.

## 6. Abrir no celular e gerar QR Code definitivo

A página definitiva será algo como:

```
https://ras-company-rotas.onrender.com/v/fazenda-maravilha
```

Faça os testes no celular via 4G/5G, não só no Wi-Fi. Autorize o GPS. Na administração LOCAL `http://localhost:5173/admin`, em **QR Code e link**, preencha o Endereço base do site com a URL raiz HTTPS acima (sem `/v/...`). Gere o QR Code NOVO e teste antes de imprimir na balança.

## 7. Quando cadastrar ou editar um destino

Salve no painel local e rode:

```powershell
& 'C:\RAS\mapa-visitantes-ras\09_ATUALIZAR_RENDER_WINDOWS.ps1'
```

O script exporta só os dados ativos, faz `git commit` dos snapshots e `git push`. O Render conectado ao GitHub faz um novo deploy se o auto-deploy estiver habilitado. O mesmo QR Code continua válido.

## Limitações relevantes

- **Esta V4.2 é leitura pública estática**: não possui API/banco na nuvem para cadastros online em tempo real. Alterações exigem exportação e push.
- Não publique locais sigilosos: um visitante com acesso ao link pode ler todos os dados e coordenadas publicados, inclusive os JSONs.
- A rota só segue os pontos que você realmente desenhou. Se aparecer linha reta, edite/salve o caminho na administração local ANTES de executar `08_PREPARAR_RENDER_WINDOWS.ps1`.
- O GPS exige HTTPS, autorização e capacidade de localização do dispositivo; a precisão varia.
- A API original, senha e banco JSON local **não são apropriados para publicar como Web Service com escrita diretamente**, porque o Render tem filesystem efêmero por padrão e a autenticação atual é simples. Para edição online, migrar para API autenticada e armazenamento persistente.
