export const CATEGORY = {
  balanca: { label: 'Balança', icon: '⚖️', color: '#F4A62A' },
  fabrica: { label: 'Fábrica', icon: '🏭', color: '#245C3A' },
  escritorio: { label: 'Escritório', icon: '🏢', color: '#456D7B' },
  barreira: { label: 'Barreira sanitária', icon: '🛡️', color: '#4B8462' },
  portaria: { label: 'Portaria', icon: '🚧', color: '#D99621' },
  almoxarifado: { label: 'Almoxarifado', icon: '📦', color: '#8B783A' },
  recebimento: { label: 'Recebimento / expedição', icon: '🚚', color: '#63795A' },
  outros: { label: 'Outros', icon: '📍', color: '#607760' },
};

export const FALLBACK_CENTER = [-20.55, -48.55]; // Referencia visual generica; nao representa uma unidade RAS.

export function coord(n) {
  return typeof n === 'number' ? n.toFixed(6) : '—';
}

export function mapsUrl(point) {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=driving`;
}

export function wazeUrl(point) {
  return `https://waze.com/ul?ll=${point.lat}%2C${point.lng}&navigate=yes`;
}
