import test from 'node:test';
import assert from 'node:assert/strict';
import { destinationPath, destinationListPath, publicDestinations, hasPublishedRoute, destinationDistance, searchDestinations } from './destinationNavigation.js';

const points = [
  { id: 'origem', name: 'Balanca', isOrigin: true },
  { id: 'fabrica', name: 'Fabrica Racao', category: 'fabrica', description: 'Setor industrial', isOrigin: false, routePath: [{lat: -20, lng: -48}, {lat:-20.0001,lng:-48.0001},{lat:-20.0002,lng:-48.0002}] },
  { id: 'escritorio', name: 'Escritorio', category: 'escritorio', isOrigin: false, routePath: [] },
];

test('o QR continua abrindo a lista antiga', () => assert.equal(destinationListPath('fazenda-maravilha'), '/v/fazenda-maravilha'));
test('cada local tem link individual', () => assert.equal(destinationPath('fazenda-maravilha','fabrica'), '/v/fazenda-maravilha/local/fabrica'));
test('segmentos de URL sao codificados', () => assert.equal(destinationPath('a b','1/2'), '/v/a%20b/local/1%2F2'));
test('nao oferece a origem como destino', () => assert.deepEqual(publicDestinations(points).map(p=>p.id), ['fabrica','escritorio']));
test('identifica caminhos desenhados', () => {assert.equal(hasPublishedRoute(points[1]), true); assert.equal(hasPublishedRoute(points[2]), false); assert.ok(destinationDistance(points[1])); assert.equal(destinationDistance(points[2]), null);});
test('busca por nome ignorando acentos', () => assert.deepEqual(searchDestinations(points, 'fabrica').map(p=>p.id), ['fabrica']));
test('busca por categoria ignorando acentos', () => assert.deepEqual(searchDestinations(points, 'escritorio', {escritorio:'Escrit\u00f3rio'}).map(p=>p.id), ['escritorio']));
