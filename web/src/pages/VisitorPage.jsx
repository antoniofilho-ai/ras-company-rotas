import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, CircleAlert, Clock3,
  Crosshair, Footprints, Info, LocateFixed,
  Navigation, Route, Search, ShieldCheck, Truck, X,
} from 'lucide-react';
import { getPublicUnit } from '../api.js';
import { Brand } from '../components/Brand.jsx';
import { CATEGORY, FALLBACK_CENTER } from '../constants.js';
import { PlaceMap } from '../components/PlaceMap.jsx';
import { distanceLabel, nearestOnRoute, pathMeters } from '../utils/routeGeometry.js';

function errorText(err) {
  if (err?.code === 1) return 'Você não autorizou a localização. Permita o acesso ao GPS nas configurações do navegador para acompanhar o trajeto.';
  if (err?.code === 2) return 'Não foi possível obter a localização. Verifique se o GPS do celular está ativado.';
  if (err?.code === 3) return 'O GPS demorou a responder. Tente novamente ao ar livre.';
  return 'Não foi possível obter a localização do celular.';
}

export function VisitorPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsRequested, setGpsRequested] = useState(false);
  const [follow, setFollow] = useState(false);
  const [focusCurrent, setFocusCurrent] = useState(false);
  const [mapFitCounter, setMapFitCounter] = useState(0);
  const [travelMode, setTravelMode] = useState('vehicle');
  const [showInfo, setShowInfo] = useState(false);
  const watchRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setBusy(true); setError(''); setSelectedId(null); setCurrentLocation(null);
    getPublicUnit(slug).then(value => {
      if (!alive) return;
      setData(value);
      const mainDest = value.points.find(p => !p.isOrigin && p.routePath?.length >= 3)
        || value.points.find(p => !p.isOrigin) || null;
      setSelectedId(mainDest?.id || null);
      setBusy(false);
    }).catch(err => { if (alive) { setError(err.message); setBusy(false); } });
    return () => { alive = false; };
  }, [slug]);

  const activateGps = useCallback(() => {
    setGpsRequested(true);
    if (!window.isSecureContext) {
      setGpsError('O navegador exige HTTPS para liberar o GPS no celular. Para testes, utilize o link seguro gerado pelo script 05.');
      return;
    }
    if (!navigator.geolocation) { setGpsError('Seu navegador não disponibiliza geolocalização.'); return; }
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setGpsBusy(true); setGpsError('');
    watchRef.current = navigator.geolocation.watchPosition(
      position => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        setCurrentLocation({ lat: latitude, lng: longitude, accuracy, heading, speed });
        setGpsBusy(false); setGpsError('');
      },
      err => { setGpsBusy(false); setGpsError(errorText(err)); },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
  }, []);

  useEffect(() => {
    // QR Code no HTTPS pede GPS automaticamente. O botão permite repetir a solicitação.
    if (!data || !window.isSecureContext) return;
    activateGps();
    return () => { if (watchRef.current !== null && navigator.geolocation) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; } };
  }, [data?.unit?.slug, activateGps]);

  const points = data?.points || [];
  const destinations = points.filter(p => !p.isOrigin);
  const selected = destinations.find(p => p.id === selectedId) || null;
  const origin = points.find(p => p.isOrigin);
  const center = data ? [data.unit.centerLat, data.unit.centerLng] : FALLBACK_CENTER;
  const routePath = selected?.routePath?.length >= 3 ? selected.routePath : [];
  const gpsProgress = useMemo(() => routePath.length && currentLocation
    ? nearestOnRoute(routePath, currentLocation) : null, [routePath, currentLocation]);
  const accuracy = Number(currentLocation?.accuracy);
  const gpsReliable = !!currentLocation && Number.isFinite(accuracy) && accuracy <= 80;
  const routeThreshold = gpsReliable ? Math.max(30, Math.min(65, accuracy * 1.5)) : 30;
  const onRoute = !!gpsProgress && gpsReliable && gpsProgress.distanceFromRouteMeters <= routeThreshold;
  const remainingPath = routePath.length ? (onRoute ? gpsProgress.remainingPath : routePath) : null;
  const connectorPath = onRoute && gpsProgress.distanceFromRouteMeters > 4 && gpsProgress.distanceFromRouteMeters <= 20
    ? [currentLocation, gpsProgress.snapped] : [];
  const fullMeters = routePath.length ? pathMeters(routePath) : 0;
  const remainingMeters = onRoute ? gpsProgress.remainingMeters : fullMeters;
  const arrived = onRoute && gpsProgress.remainingMeters <= 25 && gpsProgress.distanceFromRouteMeters <= 20 && accuracy <= 30;
  const kmPerHour = travelMode === 'vehicle' ? 15 : 4.5;
  const etaMinutes = fullMeters ? Math.max(1, Math.ceil(remainingMeters / (kmPerHour * 1000 / 60))) : null;
  const available = destinations.filter(p => {
    const s = `${p.name} ${p.description || ''} ${CATEGORY[p.category]?.label || ''}`.toLocaleLowerCase('pt-BR');
    return s.includes(search.trim().toLocaleLowerCase('pt-BR'));
  });
  const visibleDest = showAll || search ? available : available.slice(0, 4);
  const secure = typeof window !== 'undefined' && window.isSecureContext;

  function selectDestination(p) {
    setSelectedId(p.id); setFollow(false); setFocusCurrent(false); setMapFitCounter(v => v + 1);
  }
  function wholeRoute() { setFollow(false); setFocusCurrent(false); setMapFitCounter(v => v + 1); }
  function startNavigation() {
    if (!currentLocation) activateGps();
    setFollow(true); setFocusCurrent(true);
  }
  function centerGps() {
    if (!currentLocation) activateGps();
    else { setFocusCurrent(true); setFollow(true); }
  }

  if (busy) return <div className="ras-wait"><img src="/ras-company-logo.png" alt="RAS Company"/><span className="spinner"/><p>Preparando o mapa da unidade...</p></div>;
  if (error) return <div className="ras-wait"><CircleAlert size={38}/><h2>Mapa indisponível</h2><p>{error}</p><Link className="btn btn-primary" to="/"><ArrowLeft size={16}/> Voltar</Link></div>;

  return (
    <div className="ras-visitor-v4">
      <header className="ras-visitor-header">
        <div className="ras-visitor-header-inner">
          <Brand compact light />
          <div className="ras-header-trailing"><span className="ras-public-tag"><ShieldCheck size={15}/> Acesso visitante</span><button type="button" onClick={() => setShowInfo(v => !v)} className="ras-header-help" aria-label="Informações"><Info size={20}/></button></div>
        </div>
      </header>
      <main className="ras-visitor-main">
        <div className="ras-welcome-bar"><div><span className="ras-section-eyebrow">BEM-VINDO À RAS COMPANY</span><h1>{data.unit.name}</h1><p>{data.unit.description || 'Encontre seu destino e siga os caminhos internos autorizados.'}</p></div><div className="ras-visitor-number"><Route size={18}/><strong>{destinations.length}</strong><span>destinos</span></div></div>
        {showInfo && <div className="ras-message is-neutral"><Info size={19}/><span>Este mapa utiliza estradas desenhadas pela unidade. O GPS fica apenas no seu navegador. Siga a sinalização, não atravesse áreas restritas e respeite as barreiras sanitárias.</span><button onClick={() => setShowInfo(false)} aria-label="Fechar"><X size={17}/></button></div>}
        <div className={`ras-gps-card ${currentLocation && gpsReliable ? 'is-on' : !secure ? 'is-http' : gpsError ? 'is-error' : 'is-waiting'}`}>
          <span className="ras-gps-symbol"><LocateFixed size={24}/></span>
          <div className="ras-gps-copy">
            <strong>{currentLocation && gpsReliable ? 'Localização ativada' : !secure ? 'Ative o GPS com HTTPS' : gpsError ? 'GPS não disponível' : gpsBusy ? 'Localizando seu celular...' : currentLocation ? 'Aguardando melhor precisão' : 'Ativar localização'}</strong>
            <small>{currentLocation ? `Posição atual recebida · Precisão aproximada de ±${Math.round(accuracy || 0)} m` : !secure ? 'O link HTTP por IP não permite GPS no celular. Use um endereço HTTPS.' : gpsError || (gpsBusy ? 'Confirme a permissão solicitada pelo navegador.' : 'Autorize o GPS para acompanhar a estrada até o destino.')}</small>
          </div>
          <button type="button" className="ras-gps-action" onClick={centerGps} title="Ativar ou centralizar minha localização" aria-label="Ativar ou centralizar GPS">{currentLocation && gpsReliable ? <Check size={22}/> : <Crosshair size={20}/>}</button>
        </div>
        {!!gpsError && secure && <div className="ras-message"><CircleAlert size={18}/><span>{gpsError}</span><button onClick={() => setGpsError('')} aria-label="Fechar"><X size={16}/></button></div>}
        {routePath.length > 0 && currentLocation && !gpsReliable && <div className="ras-message"><CircleAlert size={17}/><span>A precisão do GPS está baixa. O trajeto inteiro permanece visível até o sinal melhorar.</span></div>}
        {routePath.length > 0 && currentLocation && gpsReliable && !onRoute && <div className="ras-message"><CircleAlert size={18}/><span>Você está a cerca de {distanceLabel(gpsProgress.distanceFromRouteMeters)} do trajeto cadastrado. Não foi calculado nenhum atalho; procure a estrada indicada ou peça orientação.</span></div>}
        <section className="ras-destination-card" aria-labelledby="dest-heading">
          <div className="ras-card-title"><div><span className="ras-gold-circle"><Crosshair size={21}/></span><h2 id="dest-heading">Selecione seu destino</h2></div>{destinations.length > 4 && <button type="button" onClick={() => setShowAll(v => !v)}>{showAll ? 'Mostrar menos' : 'Ver todos'} <ArrowRight size={14}/></button>}</div>
          <div className="ras-destination-grid">
            {visibleDest.map(p => <button type="button" key={p.id} onClick={() => selectDestination(p)} className={`ras-destination-option ${selected?.id === p.id ? 'is-selected' : ''}`} aria-pressed={selected?.id === p.id}>
              <span className="ras-destination-emoji">{CATEGORY[p.category]?.icon || '📍'}</span><span>{p.name}</span>
            </button>)}
            {visibleDest.length === 0 && <span className="ras-no-dest">Nenhum destino disponível.</span>}
          </div>
          {(showAll || destinations.length > 4) && <label className="ras-dest-search"><Search size={16}/><input placeholder="Buscar fábrica, escritório, barreira..." value={search} onChange={e => setSearch(e.target.value)} /></label>}
        </section>
        <section className="ras-visitor-mapbox" aria-label="Mapa interativo de localização">
          <div className="ras-map-inner">
            <PlaceMap
              points={points} center={center} selectedId={selectedId} onSelect={p => { if (!p.isOrigin) selectDestination(p); }}
              currentLocation={currentLocation} focusCurrent={focusCurrent} followCurrent={follow && gpsReliable}
              routePath={routePath} remainingPath={remainingPath} connectorPath={connectorPath}
              fitKey={`${slug}:${selectedId}:${mapFitCounter}`} />
            <div className="ras-map-upper-left"><span className="ras-map-live-dot"/>Google Maps · Híbrido</div>
            <button className="ras-map-mypos" type="button" onClick={centerGps} aria-label="Centralizar GPS"><LocateFixed size={21}/></button>
          </div>
          <div className="ras-map-legend">
            <span><i className="ras-legend-blue"/>Sua localização</span><span><i className="ras-legend-green"/>Caminho a seguir</span><span><i className="ras-legend-grey"/>Rota completa</span>
          </div>
        </section>
        <section className="ras-route-panel">
          <div className="ras-route-top"><div className="ras-route-title"><span className="ras-route-symbol"><Navigation size={19}/></span><div><small>DESTINO SELECIONADO</small><h2>{selected?.name || 'Escolha um local acima'}</h2></div></div><span className={`ras-route-pill ${routePath.length ? 'good' : ''}`}>{routePath.length ? `${arrived ? 'Você chegou' : onRoute ? 'Na rota' : 'Rota cadastrada'}` : 'Sem caminho'}</span></div>
          {selected?.description && <p className="ras-route-description">{selected.description}</p>}
          <div className="ras-route-stats">
            <div><Route size={23}/><span><small>{onRoute ? 'Distância restante' : 'Distância do trajeto'}</small><strong>{routePath.length ? distanceLabel(remainingMeters) : '—'}</strong></span></div>
            <div><Clock3 size={23}/><span><small>Tempo aproximado</small><strong>{etaMinutes ? `${etaMinutes} min` : '—'}</strong></span></div>
            <div><ShieldCheck size={23}/><span><small>Orientação</small><strong>{arrived ? 'Chegada' : onRoute ? 'No caminho' : routePath.length ? 'Siga a via' : 'Sem rota'}</strong></span></div>
          </div>
          <div className="ras-travel-line"><span>Estimativa:</span><button type="button" className={travelMode === 'vehicle' ? 'chosen' : ''} onClick={() => setTravelMode('vehicle')}><Truck size={15}/> Veículo até 15 km/h</button><button type="button" className={travelMode === 'walk' ? 'chosen' : ''} onClick={() => setTravelMode('walk')}><Footprints size={15}/> A pé</button></div>
          <div className="ras-route-actions"><button className="ras-action-main" type="button" disabled={!routePath.length} onClick={startNavigation}><Navigation size={21}/>{follow ? 'Acompanhando sua posição' : 'Iniciar navegação'}</button><button className="ras-action-outline" type="button" onClick={wholeRoute} disabled={!routePath.length}><Route size={19}/> Ver caminho inteiro</button></div>
          <div className="ras-route-footnote">{!selected ? 'Selecione um destino para começar.' : !routePath.length ? 'O destino ainda não possui caminho interno publicado. Consulte a balança.' : arrived ? 'Você está próximo do destino. Confirme a entrada permitida e siga a sinalização.' : follow && onRoute ? 'O ponto azul acompanha seu GPS. A linha verde representa o trecho restante da rota desenhada.' : currentLocation && !onRoute ? 'Sua posição aparece em azul. A rota cadastrada permanece visível; não inventamos caminhos fora da estrada.' : 'O percurso segue os pontos desenhados pelo administrador. GPS e tempo são estimativas.'}</div>
        </section>
        <div className="ras-visitor-safety"><ShieldCheck size={19}/><span>Por segurança, siga apenas vias autorizadas, respeite barreiras e limite de velocidade. A precisão do GPS varia. Sua localização não é enviada ao servidor.</span></div>
      </main>
      <footer className="ras-visitor-bottom"><img src="/ras-company-logo.png" alt=""/><span>RAS Company · Rotas para Visitantes</span><span>© 2026</span></footer>
    </div>
  );
}
