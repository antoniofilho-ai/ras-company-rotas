// Exportacao EXPLICITA dos dados publicos da RAS Company Rotas para Render Static Site.
// Nunca envie api/data/mapa-visitantes.json nem credenciais para GitHub.
// Apenas unidades/locais ativos e os caminhos associados ficam no site publico.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SOURCE = path.resolve(ROOT, 'api/data/mapa-visitantes.json');
const PUBLIC_ROOT = path.resolve(ROOT, 'web/public');
const DESTINATION = path.join(PUBLIC_ROOT, 'public-data');

function isNumberInRange(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function validLatLng(value) {
  return !!value && isNumberInRange(value.lat, -90, 90) && isNumberInRange(value.lng, -180, 180);
}
function text(value, maxLength = 300) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function createPublicSnapshots(database) {
  if (!database || !Array.isArray(database.units) || !Array.isArray(database.points)) {
    throw new Error('Banco JSON invalido: esperado objeto com units[] e points[].');
  }
  const uniqueSlugs = new Set();
  const snapshots = [];
  const activeUnits = database.units.filter(unit => unit.active === true);
  for (const unit of activeUnits) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(unit.slug || '')) {
      throw new Error(`Unidade ativa possui identificador de link invalido: ${unit.name || 'sem nome'}`);
    }
    if (uniqueSlugs.has(unit.slug)) throw new Error(`Identificador duplicado: ${unit.slug}`);
    uniqueSlugs.add(unit.slug);
    if (!isNumberInRange(unit.centerLat, -90, 90) || !isNumberInRange(unit.centerLng, -180, 180)) {
      throw new Error(`Unidade ${unit.slug}: centro do mapa invalido.`);
    }
    const points = database.points
      .filter(point => point.active === true && point.unitId === unit.id && validLatLng(point))
      .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || text(a.name).localeCompare(text(b.name), 'pt-BR'));
    const origin = points.find(point => point.isOrigin === true);
    const cleanPoints = points.map(point => ({
      id: String(point.id),
      name: text(point.name, 90),
      category: text(point.category, 40),
      description: text(point.description),
      lat: point.lat,
      lng: point.lng,
      sortOrder: Number.isSafeInteger(point.sortOrder) ? point.sortOrder : 0,
      isOrigin: point.isOrigin === true,
      routePath: origin && point.isOrigin !== true && Array.isArray(point.routePath)
        && point.routePath.length >= 3 && point.routePath.length <= 302
        && point.routePath.every(validLatLng)
        ? point.routePath.map(({ lat, lng }) => ({ lat, lng })) : [],
    }));
    snapshots.push({
      unit: {
        name: text(unit.name, 90),
        slug: unit.slug,
        description: text(unit.description),
        centerLat: unit.centerLat,
        centerLng: unit.centerLng,
      },
      points: cleanPoints,
    });
  }
  if (snapshots.length === 0) throw new Error('Nenhuma unidade ativa para publicar. Ative ao menos uma unidade no painel.');
  return snapshots;
}

export function writePublicSnapshots(snapshots, directory = DESTINATION) {
  const parent = path.dirname(directory);
  fs.mkdirSync(parent, { recursive: true });
  const staging = fs.mkdtempSync(path.join(parent, '.ras-publish-'));
  try {
    const units = snapshots.map(({ unit, points }) => ({
      slug: unit.slug, name: unit.name, description: unit.description,
      destinations: points.filter(point => !point.isOrigin).length,
    }));
    fs.writeFileSync(path.join(staging, 'units.json'), JSON.stringify({ units }, null, 2) + '\n', 'utf8');
    for (const snap of snapshots) {
      fs.writeFileSync(path.join(staging, `${snap.unit.slug}.json`), JSON.stringify(snap, null, 2) + '\n', 'utf8');
    }
    const backup = `${directory}.old`;
    fs.rmSync(backup, { recursive: true, force: true });
    if (fs.existsSync(directory)) fs.renameSync(directory, backup);
    try { fs.renameSync(staging, directory); }
    catch (error) { if (fs.existsSync(backup)) fs.renameSync(backup, directory); throw error; }
    fs.rmSync(backup, { recursive: true, force: true });
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = process.env.RAS_PUBLIC_SOURCE ? path.resolve(process.env.RAS_PUBLIC_SOURCE) : DEFAULT_SOURCE;
  if (!fs.existsSync(source)) {
    console.error(`Arquivo de cadastros nao encontrado: ${source}`);
    console.error('Execute na maquina que contem os cadastros da Fazenda Maravilha.');
    process.exit(1);
  }
  try {
    const db = JSON.parse(fs.readFileSync(source, 'utf8'));
    const snapshots = createPublicSnapshots(db);
    writePublicSnapshots(snapshots);
    const count = snapshots.reduce((sum, s) => sum + s.points.length, 0);
    const routes = snapshots.reduce((sum, s) => sum + s.points.filter(p => p.routePath.length >= 3).length, 0);
    console.log(`Exportacao finalizada: ${snapshots.length} unidade(s), ${count} ponto(s), ${routes} rota(s).`);
    snapshots.forEach(s => console.log(`  /v/${s.unit.slug}: ${s.unit.name}`));
    console.log('Dados PUBLICOS prontos em web/public/public-data/.');
    console.log('O JSON ORIGINAL e as credenciais continuam fora do GitHub.');
    if (routes === 0) console.warn('ATENCAO: nao ha caminhos internos publicados. Desenhe e salve as rotas antes de gerar o QR Code definitivo.');
  } catch (error) {
    console.error(`Falha ao exportar: ${error.message}`);
    process.exitCode = 1;
  }
}
