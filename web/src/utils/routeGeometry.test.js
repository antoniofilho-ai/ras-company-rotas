import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters, pathMeters, nearestOnRoute, distanceLabel } from './routeGeometry.js';
const a = {lat: -20, lng: -48};
const b = {lat: -20, lng: -47.999};
const c = {lat: -19.999, lng: -47.999};
const path = [a,b,c];
test('percurso em metros e formatacao', () => {
  assert.ok(distanceMeters(a, b) > 100);
  assert.ok(pathMeters(path) > 200);
  assert.equal(distanceLabel(975), '975 m');
  assert.match(distanceLabel(1250), /km/);
});
test('gps no inicio recebe rota toda', () => {
  const snap = nearestOnRoute(path, a);
  assert.ok(snap.distanceFromRouteMeters < .001);
  assert.equal(snap.segmentIndex, 0);
  assert.ok(Math.abs(snap.remainingMeters - pathMeters(path)) < 1);
});
test('gps no meio recebe somente parte restante', () => {
  const snap = nearestOnRoute(path, {lat: -20, lng: -47.9995});
  assert.ok(snap.distanceFromRouteMeters < 1);
  assert.equal(snap.segmentIndex, 0);
  assert.equal(snap.remainingPath.length, 3);
  assert.ok(snap.remainingMeters < pathMeters(path));
});
test('gps fora do caminho sinaliza afastamento', () => {
  const snap = nearestOnRoute(path, {lat: -19.997, lng: -48.005});
  assert.ok(snap.distanceFromRouteMeters > 100);
});
test('entrada invalida nao cria caminho', () => {
  assert.equal(nearestOnRoute([], a), null);
  assert.equal(nearestOnRoute(path, null), null);
});
