import express from 'express';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE || path.resolve(__dirname, '../data/mapa-visitantes.json');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD_B64
  ? Buffer.from(process.env.ADMIN_PASSWORD_B64, 'base64').toString('utf8')
  : (process.env.ADMIN_PASSWORD || '');

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8 || ADMIN_PASSWORD === 'SUBSTITUA_PELO_SCRIPT_01') {
  console.error('ERRO: Configure uma senha administrativa em api/.env. Execute 01_INICIAR_WINDOWS.ps1.');
  process.exit(1);
}
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error('ERRO: PORT invalida em api/.env.');
  process.exit(1);
}

const CATEGORIES = new Set(['balanca', 'fabrica', 'escritorio', 'barreira', 'portaria', 'almoxarifado', 'recebimento', 'outros']);
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));

function fail(res, message, code = 400) { return res.status(code).json({ error: message }); }
function now() { return new Date().toISOString(); }
function cleanText(input, max = 150) { return typeof input === 'string' ? input.trim().slice(0, max) : ''; }
function isBool(v, fallback = true) { return typeof v === 'boolean' ? v : fallback; }
function coordinate(v, min, max) {
  if (v === null || v === undefined || `${v}`.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function id() { return crypto.randomUUID(); }
function safeEqual(received, expected) {
  if (typeof received !== 'string') return false;
  const a = Buffer.from(received, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function requireAdmin(req, res, next) {
  if (!safeEqual(req.headers['x-admin-password'], ADMIN_PASSWORD)) {
    return fail(res, 'Acesso administrativo nao autorizado.', 401);
  }
  next();
}

function loadDb() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ units: [], points: [] }, null, 2));
  }
  const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!Array.isArray(raw.units) || !Array.isArray(raw.points)) {
    throw new Error('Arquivo de dados invalido. Faca backup e confira api/data/mapa-visitantes.json.');
  }
  return raw;
}
let db = loadDb();
function persist() {
  const temp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(temp, DB_FILE);
}

// Leitura publica: somente unidades e pontos explicitamente ativos.
// A tela publica no futuro podera ser hospedada em dominio diferente.
app.use('/api/public', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
app.get('/api/public/units/:slug', (req, res) => {
  const unit = db.units.find(u => u.slug === req.params.slug && u.active);
  if (!unit) return fail(res, 'Unidade nao encontrada ou indisponivel.', 404);
  const points = db.points
    .filter(p => p.unitId === unit.id && p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pt-BR'));
  const origin = points.find(p => p.isOrigin);
  const published = points.map(p => ({
    id: p.id, name: p.name, category: p.category, description: p.description,
    lat: p.lat, lng: p.lng, sortOrder: p.sortOrder, isOrigin: p.isOrigin,
    // O publico recebe apenas rotas dos destinos ativos, com origem ativa.
    routePath: origin && !p.isOrigin && Array.isArray(p.routePath) && p.routePath.length >= 3
      ? p.routePath : [],
  }));
  return res.json({ unit: { name: unit.name, slug: unit.slug, description: unit.description, centerLat: unit.centerLat, centerLng: unit.centerLng }, points: published });
});

app.post('/api/admin/login', (req, res) => {
  if (!safeEqual(req.headers['x-admin-password'], ADMIN_PASSWORD)) return fail(res, 'Senha incorreta.', 401);
  return res.json({ ok: true });
});
app.use('/api/admin', requireAdmin);

app.get('/api/admin/units', (_req, res) => {
  res.json({ units: db.units.map(u => ({ ...u, pointCount: db.points.filter(p => p.unitId === u.id).length })) });
});

function readUnitBody(body, existingId) {
  const name = cleanText(body.name, 90);
  const slug = cleanText(body.slug, 80).toLowerCase();
  const description = cleanText(body.description, 300);
  const centerLat = coordinate(body.centerLat, -90, 90);
  const centerLng = coordinate(body.centerLng, -180, 180);
  if (name.length < 2) return { error: 'Informe o nome da unidade (minimo 2 caracteres).' };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { error: 'Link da unidade invalido. Use letras minusculas, numeros e hifens.' };
  if (db.units.some(u => u.slug === slug && u.id !== existingId)) return { error: 'Este identificador de link ja esta em uso.' };
  if (centerLat === null || centerLng === null) return { error: 'Informe latitude e longitude validas do centro da unidade.' };
  return { value: { name, slug, description, centerLat, centerLng, active: isBool(body.active) } };
}

app.post('/api/admin/units', (req, res) => {
  const parsed = readUnitBody(req.body || {});
  if (parsed.error) return fail(res, parsed.error);
  const createdAt = now();
  const unit = { id: id(), ...parsed.value, createdAt, updatedAt: createdAt };
  db.units.push(unit);
  persist();
  return res.status(201).json({ unit });
});
app.put('/api/admin/units/:id', (req, res) => {
  const unit = db.units.find(u => u.id === req.params.id);
  if (!unit) return fail(res, 'Unidade nao encontrada.', 404);
  const parsed = readUnitBody(req.body || {}, unit.id);
  if (parsed.error) return fail(res, parsed.error);
  Object.assign(unit, parsed.value, { updatedAt: now() });
  persist();
  return res.json({ unit });
});
app.delete('/api/admin/units/:id', (req, res) => {
  const unit = db.units.find(u => u.id === req.params.id);
  if (!unit) return fail(res, 'Unidade nao encontrada.', 404);
  db.units = db.units.filter(u => u.id !== unit.id);
  db.points = db.points.filter(p => p.unitId !== unit.id);
  persist();
  return res.json({ ok: true });
});

app.get('/api/admin/units/:id/points', (req, res) => {
  if (!db.units.some(u => u.id === req.params.id)) return fail(res, 'Unidade nao encontrada.', 404);
  const points = db.points.filter(p => p.unitId === req.params.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pt-BR'));
  return res.json({ points });
});

function readPointBody(body, unitId) {
  const name = cleanText(body.name, 90);
  const category = cleanText(body.category, 40);
  const description = cleanText(body.description, 300);
  const lat = coordinate(body.lat, -90, 90);
  const lng = coordinate(body.lng, -180, 180);
  const sortOrder = Number.isSafeInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
  if (!db.units.some(u => u.id === unitId)) return { error: 'Unidade nao encontrada.' };
  if (name.length < 2) return { error: 'Informe o nome do local (minimo 2 caracteres).' };
  if (!CATEGORIES.has(category)) return { error: 'Categoria invalida.' };
  if (lat === null || lng === null) return { error: 'Marque um ponto no mapa ou informe coordenadas validas.' };
  if (Math.abs(sortOrder) > 100000) return { error: 'Ordem deve ficar entre -100000 e 100000.' };
  return { value: { unitId, name, category, description, lat, lng, sortOrder, active: isBool(body.active), isOrigin: isBool(body.isOrigin, false) } };
}
function enforceUniqueOrigin(point) {
  if (point.isOrigin) {
    for (const other of db.points) {
      if (other.unitId === point.unitId && other.id !== point.id) other.isOrigin = false;
    }
  }
}
function alignUnitRoutes(unitId) {
  const origin = db.points.find(p => p.unitId === unitId && p.isOrigin);
  for (const point of db.points.filter(p => p.unitId === unitId)) {
    if (!Array.isArray(point.routePath) || point.routePath.length < 3) continue;
    if (!origin || point.isOrigin) {
      point.routePath = [];
      continue;
    }
    // Origem/destino estao fixos; ajuste geometrico quando um local e movido.
    point.routePath[0] = { lat: origin.lat, lng: origin.lng };
    point.routePath[point.routePath.length - 1] = { lat: point.lat, lng: point.lng };
  }
}

function readWaypoints(body) {
  const waypoints = body?.waypoints;
  if (!Array.isArray(waypoints) || waypoints.length < 1 || waypoints.length > 300) {
    return { error: 'Desenhe pelo menos uma curva/ponto intermediario; maximo de 300 pontos.' };
  }
  const cleaned = [];
  for (const p of waypoints) {
    const lat = coordinate(p?.lat, -90, 90);
    const lng = coordinate(p?.lng, -180, 180);
    if (lat === null || lng === null) return { error: 'Um dos pontos desenhados tem coordenadas invalidas.' };
    cleaned.push({ lat, lng });
  }
  return { value: cleaned };
}

app.post('/api/admin/units/:id/points', (req, res) => {
  const parsed = readPointBody(req.body || {}, req.params.id);
  if (parsed.error) return fail(res, parsed.error);
  const createdAt = now();
  const point = { id: id(), ...parsed.value, createdAt, updatedAt: createdAt };
  enforceUniqueOrigin(point);
  db.points.push(point);
  alignUnitRoutes(point.unitId);
  persist();
  return res.status(201).json({ point });
});
app.put('/api/admin/points/:id', (req, res) => {
  const point = db.points.find(p => p.id === req.params.id);
  if (!point) return fail(res, 'Local nao encontrado.', 404);
  const parsed = readPointBody(req.body || {}, point.unitId);
  if (parsed.error) return fail(res, parsed.error);
  Object.assign(point, parsed.value, { updatedAt: now() });
  enforceUniqueOrigin(point);
  alignUnitRoutes(point.unitId);
  persist();
  return res.json({ point });
});
app.delete('/api/admin/points/:id', (req, res) => {
  const deleted = db.points.find(p => p.id === req.params.id);
  if (!deleted) return fail(res, 'Local nao encontrado.', 404);
  db.points = db.points.filter(p => p.id !== req.params.id);
  alignUnitRoutes(deleted.unitId);
  persist();
  return res.json({ ok: true });
});

// Caminhos privativos da unidade, desenhados pelo administrador.
// Nao e Google Directions: o trajeto publicado segue EXATAMENTE os vertices salvos.
app.put('/api/admin/points/:id/route', (req, res) => {
  const point = db.points.find(p => p.id === req.params.id);
  if (!point) return fail(res, 'Destino nao encontrado.', 404);
  if (point.isOrigin) return fail(res, 'O ponto inicial nao pode ser o proprio destino.');
  if (!point.active) return fail(res, 'Ative o destino antes de publicar um caminho.');
  const origin = db.points.find(p => p.unitId === point.unitId && p.isOrigin && p.active);
  if (!origin) return fail(res, 'Cadastre e publique a balanca como ponto inicial antes de tracar rotas.');
  const parsed = readWaypoints(req.body || {});
  if (parsed.error) return fail(res, parsed.error);
  point.routePath = [
    { lat: origin.lat, lng: origin.lng },
    ...parsed.value,
    { lat: point.lat, lng: point.lng },
  ];
  point.updatedAt = now();
  persist();
  return res.json({ point, routeLength: point.routePath.length });
});
app.delete('/api/admin/points/:id/route', (req, res) => {
  const point = db.points.find(p => p.id === req.params.id);
  if (!point) return fail(res, 'Destino nao encontrado.', 404);
  point.routePath = [];
  point.updatedAt = now();
  persist();
  return res.json({ ok: true });
});

app.get('/api/health' , (_req, res) => res.json({ ok: true, service: 'mapa-visitantes-ras-api', timestamp: now() }));
app.use('/api', (_req, res) => fail(res, 'Rota da API nao encontrada.', 404));
app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) return fail(res, 'JSON invalido.', 400);
  console.error('Erro na API:', err.message);
  return fail(res, 'Erro interno. Consulte os logs da API.', 500);
});

app.listen(PORT, HOST, () => {
  console.log(`API local: http://${HOST}:${PORT}`);
  console.log(`Banco local: ${DB_FILE}`);
  console.log('Pontos administrativos protegidos por senha. Nao publique esta API em producao sem integrar autenticacao e banco persistente.');
});
