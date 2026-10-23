import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORY, FALLBACK_CENTER } from '../constants.js';
import { nearestOnRoute } from '../utils/routeGeometry.js';

const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID').trim();
const DEFAULT_MAP_TYPE = (import.meta.env.VITE_GOOGLE_MAP_TYPE || 'hybrid').toLowerCase() === 'roadmap' ? 'roadmap' : 'hybrid';
let sdkPromise = null;

function loadGoogleSdk() {
  if (!API_KEY || API_KEY === 'SUA_CHAVE_AQUI') {
    return Promise.reject(new Error('Chave do Google Maps nao configurada. Execute o script 04 ou preencha web/.env.local.'));
  }
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) { resolve(window.google.maps); return; }
    const callbackName = '__rasMapsLoaded';
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => fail(), 18000);
    function fail() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
      reject(new Error('Falha ao carregar Google Maps. Confira conexao, chave, faturamento e restricoes HTTP do Google Cloud.'));
    }
    window[callbackName] = () => { window.clearTimeout(timeout); delete window[callbackName]; resolve(window.google.maps); };
    script.async = true; script.defer = true; script.onerror = fail;
    const params = new URLSearchParams({ key: API_KEY, v: 'weekly', loading: 'async', callback: callbackName, language: 'pt-BR', region: 'BR' });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    document.head.appendChild(script);
  }).then(async maps => {
    const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([maps.importLibrary('maps'), maps.importLibrary('marker')]);
    return { maps, Map, AdvancedMarkerElement };
  }).catch(error => { sdkPromise = null; throw error; });
  return sdkPromise;
}

function validPosition(value) {
  return value && Number.isFinite(value.lat) && Number.isFinite(value.lng) && value.lat >= -90 && value.lat <= 90 && value.lng >= -180 && value.lng <= 180;
}
function normalizePosition(value) {
  if (!value) return null;
  const lat = typeof value.lat === 'function' ? value.lat() : value.lat;
  const lng = typeof value.lng === 'function' ? value.lng() : value.lng;
  return validPosition({ lat, lng }) ? { lat, lng } : null;
}
function pin(cls, text, color = '') {
  const node = document.createElement('div');
  node.className = `${cls} google-pin`;
  if (color) node.style.setProperty('--pin-color', color);
  const label = document.createElement('span');
  label.textContent = text;
  node.appendChild(label);
  return node;
}
function infoContent(point) {
  // Textos nunca sao injetados como HTML pelo usuario.
  const wrap = document.createElement('div'); wrap.className = 'google-info';
  const h = document.createElement('strong'); h.textContent = point.name; wrap.appendChild(h);
  const type = document.createElement('div'); type.textContent = CATEGORY[point.category]?.label || 'Local'; wrap.appendChild(type);
  if (point.description) { const p = document.createElement('p'); p.textContent = point.description; wrap.appendChild(p); }
  return wrap;
}

export function PlaceMap({
  points = [], center = FALLBACK_CENTER, selectedId, onSelect, onPick, draft,
  draggableDraft = false, currentLocation, focusCurrent = false, followCurrent = false, fitKey = '',
  routePath = [], remainingPath = null, connectorPath = [],
  routeDrawing = false, routeAnchors = [], routeEditMode = 'draw', onRoutePick, onRouteInsert, onRouteVertexMove,
}) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const apiRef = useRef(null);
  const infoRef = useRef(null);
  const markerRefs = useRef([]);
  const draftRef = useRef(null);
  const gpsRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const overlayRefs = useRef([]);
  const routeMarkersRef = useRef([]);
  const clickRef = useRef(onPick);
  const selectRef = useRef(onSelect);
  const routeClickRef = useRef(onRoutePick);
  const routeInsertRef = useRef(onRouteInsert);
  const routeModeRef = useRef(routeEditMode);
  const lastFollowRef = useRef({ time: 0, lat: null, lng: null });
  const routeVertexRef = useRef(onRouteVertexMove);
  const drawingRef = useRef(routeDrawing);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  clickRef.current = onPick;
  selectRef.current = onSelect;
  routeClickRef.current = onRoutePick;
  routeInsertRef.current = onRouteInsert;
  routeModeRef.current = routeEditMode;
  routeVertexRef.current = onRouteVertexMove;
  drawingRef.current = routeDrawing;
  const mapCenter = Number.isFinite(Number(center?.[0])) && Number.isFinite(Number(center?.[1]))
    ? { lat: Number(center[0]), lng: Number(center[1]) }
    : { lat: FALLBACK_CENTER[0], lng: FALLBACK_CENTER[1] };
  const pointsSignature = useMemo(() => JSON.stringify(points.map(p => [p.id, p.name, p.description, p.category, p.lat, p.lng])), [points]);
  const routeSignature = JSON.stringify(routePath || []);
  const remainingSignature = JSON.stringify(remainingPath || []);
  const connectorSignature = JSON.stringify(connectorPath || []);
  const anchorsSignature = JSON.stringify(routeAnchors || []);

  useEffect(() => {
    let alive = true;
    let clickListener;
    loadGoogleSdk().then(api => {
      if (!alive || !elementRef.current) return;
      apiRef.current = api;
      const map = new api.Map(elementRef.current, {
        center: mapCenter, zoom: 15, mapId: MAP_ID || 'DEMO_MAP_ID',
        mapTypeId: DEFAULT_MAP_TYPE,
        mapTypeControl: true,
        mapTypeControlOptions: { style: api.maps.MapTypeControlStyle.HORIZONTAL_BAR, position: api.maps.ControlPosition.TOP_RIGHT, mapTypeIds: ['roadmap', 'hybrid'] },
        zoomControl: true, zoomControlOptions: { position: api.maps.ControlPosition.RIGHT_BOTTOM },
        streetViewControl: false, fullscreenControl: true, clickableIcons: false, gestureHandling: 'greedy',
      });
      mapRef.current = map;
      infoRef.current = new api.maps.InfoWindow({ maxWidth: 270 });
      clickListener = map.addListener('click', event => {
        if (!event.latLng) return;
        const position = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        if (drawingRef.current) {
          if (routeModeRef.current === 'insert') routeInsertRef.current?.(position);
          else routeClickRef.current?.(position);
        }
        else clickRef.current?.(position);
      });
      setReady(true);
    }).catch(err => { if (alive) setError(err.message || 'Nao foi possivel carregar o Google Maps.'); });
    return () => {
      alive = false;
      clickListener?.remove();
      infoRef.current?.close();
      markerRefs.current.forEach(m => { m.map = null; }); markerRefs.current = [];
      routeMarkersRef.current.forEach(m => { m.map = null; }); routeMarkersRef.current = [];
      overlayRefs.current.forEach(line => line.setMap(null)); overlayRefs.current = [];
      if (draftRef.current) draftRef.current.map = null;
      if (gpsRef.current) gpsRef.current.map = null;
      if (accuracyCircleRef.current) accuracyCircleRef.current.setMap(null);
      mapRef.current = null; apiRef.current = null;
    };
    // Instancia por montagem; no admin, key por unidade e aba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !apiRef.current) return;
    const { AdvancedMarkerElement } = apiRef.current;
    markerRefs.current.forEach(marker => { marker.map = null; }); markerRefs.current = [];
    infoRef.current?.close();
    for (const point of points) {
      if (!validPosition(point)) continue;
      const meta = CATEGORY[point.category] || CATEGORY.outros;
      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: point.lat, lng: point.lng }, title: point.name, gmpClickable: true,
      });
      marker.appendChild(pin(`map-marker ${point.id === selectedId ? 'map-marker-selected' : ''}`, meta.icon, meta.color));
      marker.addEventListener('gmp-click', event => {
        event.stopPropagation?.();
        selectRef.current?.(point);
        infoRef.current?.setContent(infoContent(point));
        infoRef.current?.open({ map: mapRef.current, anchor: marker });
      });
      markerRefs.current.push(marker);
    }
    return () => { markerRefs.current.forEach(marker => { marker.map = null; }); markerRefs.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pointsSignature]);

  useEffect(() => {
    if (!ready) return;
    for (const marker of markerRefs.current) {
      const m = normalizePosition(marker.position);
      const chosen = points.some(p => p.id === selectedId && m && Math.abs(m.lat - p.lat) < 1e-8 && Math.abs(m.lng - p.lng) < 1e-8);
      marker.firstElementChild?.classList.toggle('map-marker-selected', !!chosen);
    }
  }, [ready, selectedId, pointsSignature]);

  useEffect(() => {
    if (!ready || !mapRef.current || !apiRef.current) return;
    const { AdvancedMarkerElement } = apiRef.current;
    if (draftRef.current) { draftRef.current.map = null; draftRef.current = null; }
    if (!validPosition(draft)) return;
    const marker = new AdvancedMarkerElement({ map: mapRef.current, position: draft, title: 'Posicao sendo cadastrada', gmpDraggable: !!draggableDraft });
    marker.appendChild(pin('map-marker map-marker-draft', '📍'));
    if (draggableDraft) marker.addEventListener('gmp-dragend', () => { const p = normalizePosition(marker.position); if (p) clickRef.current?.(p); });
    draftRef.current = marker;
    return () => { marker.map = null; if (draftRef.current === marker) draftRef.current = null; };
  }, [ready, draft?.lat, draft?.lng, draggableDraft]);

  // Atualizacao do GPS: movimenta um unico marcador, nao recria a instância do mapa.
  useEffect(() => {
    if (!ready || !mapRef.current || !apiRef.current) return;
    if (!validPosition(currentLocation)) { if (gpsRef.current) { gpsRef.current.map = null; gpsRef.current = null; } if (accuracyCircleRef.current) accuracyCircleRef.current.setMap(null); return; }
    if (!gpsRef.current) {
      const marker = new apiRef.current.AdvancedMarkerElement({ map: mapRef.current, position: currentLocation, title: 'Sua posicao atual' });
      marker.appendChild(pin('current-location', ''));
      gpsRef.current = marker;
    } else gpsRef.current.position = currentLocation;
    // Halo de precisao do GPS; e aproximado, nao uma faixa de estrada.
    const accuracy = Number(currentLocation.accuracy);
    if (Number.isFinite(accuracy) && accuracy > 0 && accuracy < 500) {
      if (!accuracyCircleRef.current) accuracyCircleRef.current = new apiRef.current.maps.Circle({
        map: mapRef.current, center: currentLocation, radius: accuracy,
        strokeColor: '#237ee7', strokeWeight: 1, strokeOpacity: .3,
        fillColor: '#3f91f5', fillOpacity: .09, clickable: false, zIndex: 0,
      });
      else accuracyCircleRef.current.setOptions({ center: currentLocation, radius: accuracy, map: mapRef.current });
    } else if (accuracyCircleRef.current) accuracyCircleRef.current.setMap(null);
  }, [ready, currentLocation?.lat, currentLocation?.lng, currentLocation?.accuracy]);

  // GPS acompanha o navegador sem reposicionar o mapa a cada render.
  useEffect(() => {
    if (!ready || !mapRef.current || !followCurrent || !validPosition(currentLocation)) return;
    const prev = lastFollowRef.current;
    const elapsed = Date.now() - prev.time;
    const moved = prev.lat === null ? Infinity : Math.hypot((currentLocation.lat - prev.lat) * 111000, (currentLocation.lng - prev.lng) * 105000);
    if (moved < 8 && elapsed < 7000) return;
    lastFollowRef.current = { time: Date.now(), lat: currentLocation.lat, lng: currentLocation.lng };
    mapRef.current.panTo({ lat: currentLocation.lat, lng: currentLocation.lng });
    if ((mapRef.current.getZoom() || 15) < 17) mapRef.current.setZoom(17);
  }, [ready, followCurrent, currentLocation?.lat, currentLocation?.lng]);

  // Rota privada de pontos clicados pelo administrador. Nao usa o servico Directions.
  useEffect(() => {
    if (!ready || !mapRef.current || !apiRef.current) return;
    const { maps, AdvancedMarkerElement } = apiRef.current;
    overlayRefs.current.forEach(line => line.setMap(null)); overlayRefs.current = [];
    routeMarkersRef.current.forEach(marker => { marker.map = null; }); routeMarkersRef.current = [];
    const path = (routePath || []).filter(validPosition);
    const add = (coords, color, weight, opacity = 1, extra = {}) => {
      if (coords.length < 2) return;
      const line = new maps.Polyline({ map: mapRef.current, path: coords, strokeColor: color, strokeOpacity: opacity, strokeWeight: weight, clickable: false, geodesic: false, ...extra });
      overlayRefs.current.push(line);
    };
    if (path.length >= 3) {
      add(path, '#ffffff', 11, .94);
      add(path, routeDrawing ? '#f4a62a' : '#89958c', routeDrawing ? 6 : 5, .95, routeDrawing && routeEditMode === 'insert' ? { clickable: true } : {});
      if (!routeDrawing) {
        const highlight = remainingPath === null ? path : (remainingPath || []).filter(validPosition);
        if (highlight.length >= 2) { add(highlight, '#ffffff', 10, .94); add(highlight, '#149d61', 6); }
      } else {
        // No modo inserir, clicar entre dois pontos cria uma nova curva naquela posicao.
        if (routeModeRef.current === 'insert') {
          const main = overlayRefs.current[overlayRefs.current.length - 1];
          const listener = main.addListener('click', (evt) => {
            const p = evt.latLng ? { lat: evt.latLng.lat(), lng: evt.latLng.lng() } : null;
            if (p) routeInsertRef.current?.(p);
          });
          // Ouvinte removido junto ao overlay quando o path mudar.
        }
        // Somente os vertices intermediarios sao arrastaveis; balanca/destino ficam fixos.
        path.slice(1, -1).forEach((vertex, index) => {
          const marker = new AdvancedMarkerElement({ map: mapRef.current, position: vertex, title: `Curva ${index + 1}: arraste para ajustar`, gmpDraggable: true, zIndex: 1000 });
          marker.appendChild(pin('route-vertex', String(index + 1)));
          marker.addEventListener('gmp-dragend', () => {
            const pos = normalizePosition(marker.position);
            if (pos) routeVertexRef.current?.(index, pos);
          });
          routeMarkersRef.current.push(marker);
        });
      }
    }
    if (!routeDrawing && connectorPath && connectorPath.length === 2 && connectorPath.every(validPosition)) {
      const connector = new maps.Polyline({
        map: mapRef.current, path: connectorPath, clickable: false, strokeOpacity: 0,
        icons: [{ icon: { path: maps.SymbolPath.CIRCLE, fillColor: '#f59e0b', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 1, scale: 3 }, offset: '0', repeat: '14px' }],
      });
      overlayRefs.current.push(connector);
    }
    return () => {
      overlayRefs.current.forEach(line => line.setMap(null)); overlayRefs.current = [];
      routeMarkersRef.current.forEach(marker => { marker.map = null; }); routeMarkersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, routeSignature, remainingSignature, connectorSignature, routeDrawing, routeEditMode]);

  useEffect(() => {
    if (!ready || !mapRef.current || !apiRef.current) return;
    const map = mapRef.current;
    if (focusCurrent && validPosition(currentLocation)) {
      map.panTo(currentLocation); map.setZoom(Math.max(map.getZoom() || 15, 17)); return;
    }
    if (validPosition(draft)) { map.panTo(draft); return; }
    const routePoints = (routePath?.length >= 3 ? routePath : (routeDrawing ? routeAnchors : []))?.filter(validPosition) || [];
    if (routePoints.length >= 2) {
      const bounds = new apiRef.current.maps.LatLngBounds();
      routePoints.forEach(p => bounds.extend(p));
      if (!routeDrawing && validPosition(currentLocation)) {
        // Incluir GPS na moldura so quando dentro da area da rota.
        const minLat = Math.min(...routePoints.map(p => p.lat));
        const maxLat = Math.max(...routePoints.map(p => p.lat));
        const minLng = Math.min(...routePoints.map(p => p.lng));
        const maxLng = Math.max(...routePoints.map(p => p.lng));
        if (currentLocation.lat >= minLat - .001 && currentLocation.lat <= maxLat + .001 && currentLocation.lng >= minLng - .001 && currentLocation.lng <= maxLng + .001) bounds.extend(currentLocation);
      }
      map.fitBounds(bounds, 60); return;
    }
    const selected = points.find(p => p.id === selectedId);
    if (validPosition(selected)) { map.panTo(selected); map.setZoom(Math.max(map.getZoom() || 15, 17)); return; }
    const valid = points.filter(validPosition);
    if (valid.length > 1) {
      const bounds = new apiRef.current.maps.LatLngBounds(); valid.forEach(p => bounds.extend(p)); map.fitBounds(bounds, 56);
    } else if (valid.length === 1) { map.setCenter(valid[0]); map.setZoom(17); }
    else { map.setCenter(mapCenter); map.setZoom(15); }
    // GPS nao entra nas dependencias: acompanhar mapa automaticamente cada segundo atrapalha o visitante.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey, selectedId, draft?.lat, draft?.lng, focusCurrent, anchorsSignature]);

  if (error) return <div className="google-map-message" role="alert"><strong>Google Maps indisponível</strong><p>{error}</p><small>Confira web/.env.local, o faturamento e as restrições HTTP da chave no Google Cloud.</small></div>;
  return <div className="google-map-shell"><div ref={elementRef} className="google-map-canvas" aria-label="Mapa interativo Google Maps e caminhos internos" />{!ready && <div className="google-map-loading" role="status">Carregando Google Maps...</div>}</div>;
}
