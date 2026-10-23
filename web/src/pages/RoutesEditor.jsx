import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2, CircleAlert, CornerDownRight, Edit3, Eye, MapPin,
  MousePointer2, Move, RotateCcw, Route, Save, Trash2, Undo2, Plus,
  Navigation, Flag, Crosshair,
} from 'lucide-react';
import { adminRequest, bodyJson } from '../api.js';
import { CATEGORY } from '../constants.js';
import { PlaceMap } from '../components/PlaceMap.jsx';
import { nearestOnRoute, pathMeters, distanceLabel } from '../utils/routeGeometry.js';

export function RoutesEditor({ unit, points, center, password, onReload }) {
  const origin = points.find(p => p.isOrigin && p.active);
  const firstDestination = points.find(p => !p.isOrigin && p.active);
  const [destinationId, setDestinationId] = useState(firstDestination?.id || '');
  const [waypoints, setWaypoints] = useState(() => firstDestination?.routePath?.slice(1, -1) || []);
  const [mode, setMode] = useState('draw');
  const lastInsertTimeRef = useRef(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const destinations = points.filter(p => !p.isOrigin);
  const dest = destinations.find(p => p.id === destinationId) || null;
  const savedPath = Array.isArray(dest?.routePath) && dest.routePath.length >= 3 ? dest.routePath : [];
  const anchors = origin && dest ? [{ lat: origin.lat, lng: origin.lng }, { lat: dest.lat, lng: dest.lng }] : [];
  const draftPath = anchors.length === 2 && waypoints.length ? [anchors[0], ...waypoints, anchors[1]] : [];
  const canDraw = !!origin && !!dest?.active;
  const meters = useMemo(() => draftPath.length ? pathMeters(draftPath) : 0, [JSON.stringify(draftPath)]);
  const saved = !dirty && savedPath.length >= 3;

  function chooseDestination(id) {
    const next = destinations.find(p => p.id === id);
    setDestinationId(id);
    setWaypoints(next?.routePath?.slice(1, -1) || []);
    setMode('draw'); setDirty(false); setStatus(null);
  }
  function addVertex(position) {
    if (!canDraw) return;
    if (waypoints.length >= 300) { setStatus({ type: 'error', text: 'Limite de 300 curvas por trajeto.' }); return; }
    setWaypoints(prev => [...prev, position]); setDirty(true); setStatus(null);
  }
  function insertVertex(position) {
    if (!canDraw) return;
    if (Date.now() - lastInsertTimeRef.current < 220) return;
    lastInsertTimeRef.current = Date.now();
    if (!draftPath.length) { setStatus({ type: 'error', text: 'Clique nas curvas para desenhar o primeiro trajeto antes de inserir pontos no meio.' }); setMode('draw'); return; }
    const nearest = nearestOnRoute(draftPath, position);
    if (!nearest) return;
    setWaypoints(prev => [...prev.slice(0, nearest.segmentIndex), position, ...prev.slice(nearest.segmentIndex)]);
    setDirty(true); setStatus(null);
  }
  function moveVertex(index, position) { setWaypoints(prev => prev.map((p, i) => i === index ? position : p)); setDirty(true); }
  function removeVertex(index) { setWaypoints(prev => prev.filter((_, i) => i !== index)); setDirty(true); }
  function undoVertex() { setWaypoints(prev => prev.slice(0, -1)); setDirty(true); }
  function clearDraft() { setWaypoints([]); setMode('draw'); setDirty(true); setStatus(null); }
  function restoreSaved() { setWaypoints(savedPath.slice(1, -1)); setMode('draw'); setDirty(false); setStatus(null); }
  async function save() {
    if (!canDraw || !waypoints.length) { setStatus({ type: 'error', text: 'Marque pelo menos um ponto na estrada antes de salvar.' }); return; }
    setBusy(true); setStatus(null);
    try {
      await adminRequest(password, `/api/admin/points/${dest.id}/route`, { method: 'PUT', body: bodyJson({ waypoints }) });
      await onReload(); setDirty(false);
      setStatus({ type: 'success', text: `Trajeto salvo e publicado para ${dest.name}. O QR Code continua igual.` });
    } catch (err) { setStatus({ type: 'error', text: err.message }); }
    finally { setBusy(false); }
  }
  async function removeRoute() {
    if (!dest || !savedPath.length || !window.confirm(`Excluir o caminho para ${dest.name}? O local continuará cadastrado.`)) return;
    setBusy(true);
    try {
      await adminRequest(password, `/api/admin/points/${dest.id}/route`, { method: 'DELETE' });
      await onReload(); setWaypoints([]); setDirty(false); setMode('draw');
      setStatus({ type: 'success', text: 'Trajeto publicado removido. O destino permanece cadastrado.' });
    } catch (err) { setStatus({ type: 'error', text: err.message }); }
    finally { setBusy(false); }
  }
  return (
    <div className="route-editor-page ras-routes-v4">
      <div className="section-header">
        <div><div className="eyebrow green">RAS COMPANY · CONFIGURAÇÃO DE ESTRADAS</div><h2>Editor de caminhos internos</h2><p>Desenhe as vias reais sobre o Google Maps em modo satélite. Cada clique adiciona uma curva à estrada.</p></div>
        <div className="route-chip"><Route size={17}/> {destinations.filter(p => p.routePath?.length >= 3).length} de {destinations.length} rotas publicadas</div>
      </div>
      <div className="ras-editor-steps">
        <div><span>01</span><MapPin size={20}/><strong>Defina a origem</strong><small>Balança marcada como ponto inicial</small></div>
        <div><span>02</span><Flag size={20}/><strong>Escolha o destino</strong><small>Fábrica, escritório ou barreira</small></div>
        <div><span>03</span><Route size={20}/><strong>Desenhe na estrada</strong><small>Clique em cada curva e salve</small></div>
      </div>
      {!origin && <div className="banner-warn"><CircleAlert size={19}/> Primeiro cadastre a balança como <strong>ponto inicial</strong> em Locais no mapa.</div>}
      {status && <div role="status" className={status.type === 'error' ? 'banner-warn' : 'route-success'}>{status.text}</div>}
      <div className="route-layout">
        <section className="route-map-card card-panel">
          <div className="map-topline"><span><span className="status-dot"/> Google Maps · Híbrido · Edição</span><span>{mode === 'draw' ? 'Clique na próxima curva da estrada' : 'Clique entre dois pontos para inserir uma curva'}</span></div>
          <div className="ras-map-editor-guide"><MousePointer2 size={18}/><span>{mode === 'draw' ? 'Comece na estrada ao lado da BALANÇA e avance até a entrada do DESTINO. A linha dourada liga os cliques.' : 'Toque em um trecho da estrada desenhada para incluir mais uma curva entre os pontos existentes.'}</span></div>
          <div className="map-area route-map-area">
            <PlaceMap key={unit.id} points={points} center={center} selectedId={destinationId}
              onSelect={p => { if (!p.isOrigin) chooseDestination(p.id); }}
              routePath={draftPath} routeAnchors={anchors} routeDrawing={canDraw} routeEditMode={mode}
              onRoutePick={addVertex} onRouteInsert={insertVertex} onRouteVertexMove={moveVertex}
              fitKey={`v4-routes:${unit.id}:${destinationId}`} />
          </div>
          <div className="route-map-tools"><span><MousePointer2 size={16}/> {waypoints.length} {waypoints.length === 1 ? 'curva marcada' : 'curvas marcadas'} · {draftPath.length ? distanceLabel(meters) : 'Aguardando desenho'}</span><span className="route-legend"><span className="legend-amber"/> Dourado: estrada cadastrada</span></div>
        </section>
        <aside className="route-editor-side card-panel">
          <div className="form-card-title"><span className="form-icon"><Route size={20}/></span><div><h3>Desenhar a rota</h3><small>Origem → curvas → destino</small></div></div>
          <div className="route-form-inner">
            <label className="field"><span>1. ORIGEM FIXA</span><div className="route-fixed-field"><MapPin size={16}/>{origin?.name || 'Cadastre a balança primeiro'}</div></label>
            <label className="field"><span>2. DESTINO</span><select value={destinationId} onChange={e => chooseDestination(e.target.value)} disabled={!destinations.length}>
              {!destinations.length && <option value="">Cadastre um destino primeiro</option>}
              {destinations.map(p => <option key={p.id} value={p.id}>{CATEGORY[p.category]?.icon} {p.name}{p.active ? '' : ' (oculto)'}</option>)}
            </select></label>
            {dest && <div className={saved ? 'route-saved' : 'route-draft'}><CheckCircle2 size={17}/>{saved ? 'Caminho publicado' : dirty ? 'Desenho alterado · falta salvar' : savedPath.length ? 'Rota já salva, pronta para editar' : 'Ainda não existe desenho salvo'}</div>}
            <div className="ras-route-tool-label">3. FERRAMENTA DE DESENHO</div>
            <div className="ras-route-tools"><button type="button" className={mode === 'draw' ? 'is-active' : ''} onClick={() => setMode('draw')} disabled={!canDraw}><Plus size={17}/> Desenhar</button><button type="button" className={mode === 'insert' ? 'is-active' : ''} onClick={() => setMode('insert')} disabled={!canDraw || !waypoints.length}><Move size={17}/> Inserir curva</button></div>
            <div className="route-howto"><strong><CornerDownRight size={17}/> Como marcar o caminho</strong><ol><li>Amplie a imagem de satélite.</li><li>Comece ao lado da origem e clique seguindo a estrada.</li><li>Marque todas as curvas e cruzamentos até o destino.</li><li>Arraste as bolinhas numeradas para ajustar.</li><li>Salve e veja pelo link do visitante.</li></ol></div>
            <div className="route-waypoints-head"><strong>Curvas marcadas</strong><small>{waypoints.length} vértices</small></div>
            <div className="route-waypoint-list">{!waypoints.length && <p>O desenho começa ao tocar na primeira curva da estrada no mapa.</p>}
              {waypoints.map((p, i) => <div className="route-waypoint" key={i}><span className="waypoint-number">{i + 1}</span><small>{p.lat.toFixed(6)}, {p.lng.toFixed(6)}</small><button type="button" title="Remover este vértice" onClick={() => removeVertex(i)}><Trash2 size={15}/></button></div>)}
            </div>
            <div className="route-button-grid"><button className="btn btn-light" onClick={undoVertex} disabled={!waypoints.length || busy}><Undo2 size={16}/> Desfazer último</button><button className="btn btn-light" onClick={restoreSaved} disabled={!dirty || busy}><RotateCcw size={16}/> Descartar edição</button></div>
            {waypoints.length > 0 && <button className="btn btn-outline btn-block" onClick={clearDraft} disabled={busy}><Trash2 size={16}/> Recomeçar desenho</button>}
            <button className="btn btn-primary btn-block" onClick={save} disabled={!canDraw || !waypoints.length || busy}><Save size={18}/>{busy ? 'Salvando...' : 'Salvar e publicar caminho'}</button>
            {savedPath.length >= 3 && <button className="btn btn-danger-light btn-block" onClick={removeRoute} disabled={busy}><Trash2 size={16}/> Excluir caminho publicado</button>}
            <a className="btn btn-outline btn-block" href={`/v/${unit.slug}`} target="_blank" rel="noopener noreferrer"><Eye size={17}/> Testar mapa do visitante</a>
            <div className="route-warning"><CircleAlert size={18}/><span>A estrada não é calculada pelo Google: o visitante seguirá somente o que você desenhou. Verifique curvas, barreiras, limites e locais proibidos.</span></div>
          </div>
        </aside>
      </div>
      <section className="card-panel route-destinations-card"><h3>Caminhos por destino</h3><div className="route-destination-list">
        {!destinations.length && <p>Cadastre primeiro os destinos em Locais no mapa.</p>}
        {destinations.map(p => <button key={p.id} type="button" className={`route-destination-row ${destinationId === p.id ? 'selected' : ''}`} onClick={() => chooseDestination(p.id)}><span>{CATEGORY[p.category]?.icon || '📍'}</span><strong>{p.name}</strong><small>{p.routePath?.length >= 3 ? '✓ Rota publicada' : 'Sem desenho'}{!p.active ? ' · Oculto' : ''}</small><Edit3 size={16}/></button>)}
      </div></section>
    </div>
  );
}
