// Servidor HTTP publico de visualizacao temporaria, SOMENTE LEITURA.
// Serve build React e proxy APENAS /api/public/... — nunca /api/admin.
// Destinado a Cloudflare Quick Tunnel para GPS via HTTPS no celular.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '../../web/dist');
const PORT = Number(process.env.PREVIEW_PORT || 4174);
// V4.1: padrao seguro somente no computador; liberar LAN apenas pelo script 06.
const HOST = process.env.PREVIEW_HOST === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1';
const API = 'http://127.0.0.1:4000';
const ASSET_MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.png':'image/png', '.ico':'image/x-icon',
  '.svg':'image/svg+xml', '.webp':'image/webp', '.woff2':'font/woff2', '.json':'application/json',
};
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('Build do site nao encontrado. Execute "npm run build" na raiz.');
  process.exit(1);
}
function respond(res, status, body, contentType='text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType, 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin', 'Cache-Control':'no-store' });
  res.end(body);
}
function fileResponse(res, pathname) {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const full = path.resolve(DIST, requested);
  if (!full.startsWith(DIST + path.sep) && full !== path.join(DIST, 'index.html')) return respond(res, 403, 'Acesso proibido.');
  try {
    if (!fs.statSync(full).isFile()) return respond(res, 404, 'Arquivo nao encontrado.');
    const ext = path.extname(full).toLowerCase();
    if (!ASSET_MIME[ext]) return respond(res, 404, 'Arquivo nao publicado.');
    res.writeHead(200, { 'Content-Type': ASSET_MIME[ext], 'X-Content-Type-Options':'nosniff', 'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600' });
    fs.createReadStream(full).pipe(res);
  } catch { respond(res, 404, 'Arquivo nao encontrado.'); }
}
const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return respond(res, 405, 'Somente GET/HEAD.');
  let pathname;
  try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { return respond(res, 400, 'Endereco invalido.'); }
  // Nunca encaminhar APIs administrativas ou codigo-fonte pela URL publica.
  if (pathname.startsWith('/api/admin') || pathname === '/admin' || pathname.startsWith('/admin/')) {
    return respond(res, 403, 'Acesso administrativo indisponivel na previa publica.');
  }
  if (pathname === '/api/health') return respond(res, 200, JSON.stringify({ ok:true, mode:'visitor-read-only' }), 'application/json');
  if (/^\/api\/public\/units\/[a-z0-9-]+$/.test(pathname)) {
    try {
      const response = await fetch(`${API}${pathname}`, { signal: AbortSignal.timeout(8000) });
      const json = await response.text();
      return respond(res, response.status, json, 'application/json; charset=utf-8');
    } catch { return respond(res, 502, JSON.stringify({error:'API local indisponivel. Confira o script 01.'}), 'application/json'); }
  }
  if (pathname.startsWith('/api/') || pathname === '/api') return respond(res, 404, 'Rota nao disponivel.');
  if (/^\/v\/[a-z0-9-]+\/?$/.test(pathname)) return fileResponse(res, '/index.html');
  if (pathname === '/') return respond(res, 200, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>RAS Company Rotas</title><body style="background:#102219;color:#fff;font-family:Arial;max-width:550px;margin:60px auto;padding:24px"><h1 style="color:#f4a62a">RAS Company Rotas</h1><p>Acesse o mapa de visitantes pelo QR Code da sua unidade.</p><p>Este endereço é uma prévia de testes; o cadastro administrativo não está disponível.</p></body>', 'text/html; charset=utf-8');
  if (/^\/(assets\/[A-Za-z0-9_.-]+|ras-company-logo\.png|favicon\.png)$/.test(pathname)) return fileResponse(res, pathname);
  return respond(res, 404, 'Pagina nao encontrada.');
});
server.listen(PORT, HOST, () => {
  const label = HOST === '0.0.0.0' ? '(rede local, use o IPv4 deste computador)' : '(somente este computador)';
  console.log(`RAS Company Rotas - visitantes HTTP na porta ${PORT} ${label}; somente /v/SLUG e /api/public`);
});
