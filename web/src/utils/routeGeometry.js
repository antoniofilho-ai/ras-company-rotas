// Calculos locais: nao dependem de Google Directions nem de estradas publicas.
const R = 6371008.8;
const rad = n => n * Math.PI / 180;
const safe = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

export function distanceMeters(a, b) {
  if (!safe(a) || !safe(b)) return 0;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathMeters(path = []) {
  return path.reduce((sum, p, index) => index ? sum + distanceMeters(path[index - 1], p) : sum, 0);
}

export function distanceLabel(meters) {
  if (!Number.isFinite(meters)) return '—';
  return meters >= 1000 ? `${(meters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km` : `${Math.round(meters)} m`;
}

// Projeta a posicao GPS no segmento MAIS PROXIMO de uma rota desenhada.
// Equiretangular local em metros: apropriado para os trajetos curtos da unidade.
// O ponto projetado NAO e uma nova estrada; e apenas uma referencia do trajeto salvo.
export function nearestOnRoute(path, location) {
  if (!Array.isArray(path) || path.length < 2 || !safe(location)) return null;
  const centerLat = rad(location.lat);
  const toXY = p => ({ x: R * rad(p.lng - location.lng) * Math.cos(centerLat), y: R * rad(p.lat - location.lat) });
  let accumulated = 0;
  let best = null;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if (!safe(a) || !safe(b)) return null;
    const aa = toXY(a), bb = toXY(b);
    const dx = bb.x - aa.x, dy = bb.y - aa.y;
    const size2 = dx * dx + dy * dy;
    const t = size2 <= 0.00001 ? 0 : Math.max(0, Math.min(1, -(aa.x * dx + aa.y * dy) / size2));
    const px = aa.x + t * dx, py = aa.y + t * dy;
    const distance = Math.hypot(px, py);
    const segmentMeters = distanceMeters(a, b);
    if (!best || distance < best.distanceFromRouteMeters) {
      best = {
        segmentIndex: i,
        fraction: t,
        snapped: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t },
        distanceFromRouteMeters: distance,
        completedMeters: accumulated + segmentMeters * t,
      };
    }
    accumulated += segmentMeters;
  }
  if (!best) return null;
  const remainingPath = [best.snapped, ...path.slice(best.segmentIndex + 1)];
  return { ...best, totalMeters: accumulated, remainingMeters: Math.max(0, accumulated - best.completedMeters), remainingPath };
}
