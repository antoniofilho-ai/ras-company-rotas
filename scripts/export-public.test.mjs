import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createPublicSnapshots, writePublicSnapshots } from './export-public.mjs';

test('Exporta somente locais ativos e rotas ativas sem campos privados', () => {
  const route = [{lat:-20.1,lng:-48.1},{lat:-20.11,lng:-48.12},{lat:-20.2,lng:-48.2}];
  const data = {
    secret: 'private',
    units: [
      {id:'u1',name:'Unidade de teste',slug:'unidade-teste',description:'Visitantes',centerLat:-20,centerLng:-48,active:true,secret:'nao exportar'},
      {id:'u2',name:'Unidade inativa',slug:'unidade-inativa',centerLat:-19,centerLng:-48,active:false}
    ],
    points: [
      {id:'p1',unitId:'u1',name:'Portaria',category:'portaria',lat:-20.1,lng:-48.1,active:true,isOrigin:true},
      {id:'p2',unitId:'u1',name:'Escritorio',category:'escritorio',lat:-20.2,lng:-48.2,active:true,isOrigin:false,routePath:route,secret:'ocultar'},
      {id:'p3',unitId:'u1',name:'Restrito',category:'outros',lat:-20.3,lng:-48.3,active:false,routePath:route},
      {id:'p4',unitId:'u2',name:'Local de outra unidade',category:'outros',lat:-20.4,lng:-48.4,active:true}
    ]
  };
  const output=createPublicSnapshots(data);
  assert.equal(output.length,1);
  assert.equal(output[0].unit.slug,'unidade-teste');
  assert.equal(output[0].points.length,2);
  assert.equal(output[0].points.find(p => p.id === 'p2').routePath.length,3);
  assert.ok(!JSON.stringify(output).includes('private'));
  assert.ok(!JSON.stringify(output).includes('secret'));
  assert.ok(!JSON.stringify(output).includes('Restrito'));
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ras-export-test-'));
  try {
    const destination=path.join(tmp,'data');
    writePublicSnapshots(output,destination);
    assert.equal(JSON.parse(fs.readFileSync(path.join(destination,'unidade-teste.json'),'utf8')).points.length,2);
    assert.equal(JSON.parse(fs.readFileSync(path.join(destination,'units.json'),'utf8')).units.length,1);
    writePublicSnapshots(output,destination);
    assert.equal(fs.existsSync(path.join(destination,'unidade-teste.json')),true);
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});

test('Rejeita base invalida ou sem unidade publicada', () => {
  assert.throws(() => createPublicSnapshots({units:[],points:[]}), /Nenhuma unidade ativa/);
  assert.throws(() => createPublicSnapshots({units:[{slug:'abc',active:true}],points:[]}), /centro do mapa/);
});
