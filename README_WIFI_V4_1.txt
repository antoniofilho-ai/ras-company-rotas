RAS COMPANY ROTAS - HOTFIX WIFI V4.1
===================================
Causa: Na V4 o Vite esta preso a 127.0.0.1 (porta 5173) e a previa publica tambem.
Esta atualizacao preserva a V4 inteira e libera uma nova previa SOMENTE PUBLICA em
http://IP-DO-PC:4174/v/slug-da-unidade, sem liberar /admin nem /api/admin.

Arquivos:
- api/src/public-preview.js: suporta PREVIEW_HOST=0.0.0.0 somente no modo visitante.
- 06_CELULAR_WIFI_WINDOWS.ps1: cria previa LAN de visitantes na porta 4174.
- 07_LIBERAR_WIFI_FIREWALL_WINDOWS.ps1: regra de firewall limitada a LocalSubnet.

1. Pare qualquer script 05 em execucao, pois ele usa a porta 4174.
2. Extraia o ZIP em C:\RAS (nao apaga dados, senha nem chave Google).
3. Deixe 01_INICIAR_WINDOWS.ps1 aberto com API local na porta 4000.
4. Em OUTRO PowerShell execute 06_CELULAR_WIFI_WINDOWS.ps1 (autorizando o Firewall se solicitado).
5. No celular abra http://192.168.201.225:4174. Para mapa de unidade,
   use http://192.168.201.225:4174/v/SLUG, onde SLUG esta na tela de cadastro.
6. Autorize http://192.168.201.225:4174/* na chave Google Maps (HTTP referrer).
7. Para QR, no admin selecione a aba QR Code e link e use base http://192.168.201.225:4174.

ATENCAO: O GPS continua bloqueado pelo navegador em HTTP por IP da rede.
Para permitir geolocalizacao use HTTPS temporario (script 05) ou Render.
ATENCAO: Esta porta permite que dispositivos da mesma rede vejam as rotas e locais
marcados como PUBLICOS. Nao utilize para dados sigilosos da unidade.
