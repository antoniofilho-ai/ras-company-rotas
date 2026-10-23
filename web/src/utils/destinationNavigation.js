import { distanceLabel, pathMeters } from './routeGeometry.js';

export function destinationPath(slug, destinationId) {
  return `/v/${encodeURIComponent(String(slug))}/local/${encodeURIComponent(String(destinationId))}`;
}

export function destinationListPath(slug) {
  return `/v/${encodeURIComponent(String(slug))}`;
}

export function publicDestinations(points) {
  return Array.isArray(points) ? points.filter(point => !point.isOrigin) : [];
}

export function hasPublishedRoute(point) {
  return Array.isArray(point?.routePath) && point.routePath.length >= 3;
}

export function destinationDistance(point) {
  return hasPublishedRoute(point) ? distanceLabel(pathMeters(point.routePath)) : null;
}

export function searchDestinations(points, query, categoryLabels = {}) {
  const clean = (input) => String(input || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const term = clean(query).trim();
  if (!term) return publicDestinations(points);
  return publicDestinations(points).filter(point => clean(`${point.name} ${point.description || ''} ${categoryLabels[point.category] || ''}`).includes(term));
}
