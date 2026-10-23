import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, ChevronRight, CircleAlert, Compass,
  LocateFixed, MapPin, Navigation, Route, Search, ShieldCheck,
} from 'lucide-react';
import { getPublicUnit } from '../api.js';
import { Brand } from '../components/Brand.jsx';
import { CATEGORY } from '../constants.js';
import {
  destinationDistance, destinationPath, hasPublishedRoute,
  publicDestinations, searchDestinations,
} from '../utils/destinationNavigation.js';

const LABELS = Object.fromEntries(Object.entries(CATEGORY).map(([id, category]) => [id, category.label]));

export function DestinationListPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setError('');
    setSearch('');
    getPublicUnit(slug)
      .then(value => { if (active) { setData(value); setLoading(false); } })
      .catch(err => { if (active) { setError(err.message); setLoading(false); } });
    return () => { active = false; };
  }, [slug]);

  const points = data?.points || [];
  const destinations = useMemo(() => publicDestinations(points), [data]);
  const results = useMemo(() => searchDestinations(points, search, LABELS), [data, search]);
  const origin = points.find(p => p.isOrigin);
  const routedCount = destinations.filter(hasPublishedRoute).length;

  if (loading) return <div className="ras-wait"><img src="/ras-company-logo.png" alt="RAS Company"/><span className="spinner"/><p>{'Carregando os locais da unidade...'}</p></div>;
  if (error) return <div className="ras-wait"><CircleAlert size={38}/><h2>{'Unidade indispon\u00edvel'}</h2><p>{error}</p><Link className="btn btn-primary" to="/"><ArrowRight size={16}/>{'Voltar ao in\u00edcio'}</Link></div>;

  return (
    <div className="ras-visitor-v4 ras-list-page">
      <header className="ras-visitor-header">
        <div className="ras-visitor-header-inner">
          <Brand compact light />
          <span className="ras-public-tag"><ShieldCheck size={15}/>{'Guia de visitantes'}</span>
        </div>
      </header>

      <main className="ras-list-main">
        <section className="ras-list-hero">
          <div className="ras-list-hero-text">
            <div className="ras-list-overline"><span className="ras-list-signal"/>{'BEM-VINDO \u00c0 RAS COMPANY'}</div>
            <h1>{'Para onde voc\u00ea'}<br/><span>{'deseja ir?'}</span></h1>
            <p>{'Selecione um dos locais cadastrados para visualizar o caminho autorizado e acompanhar sua localiza\u00e7\u00e3o no mapa.'}</p>
            <div className="ras-list-unit-chip"><MapPin size={17}/><span>{data.unit.name}</span></div>
          </div>
          <div className="ras-list-hero-metrics">
            <div className="ras-list-metric-icon"><Compass size={27}/></div>
            <strong>{destinations.length}</strong>
            <span>{destinations.length === 1 ? 'destino dispon\u00edvel' : 'destinos dispon\u00edveis'}</span>
            {origin && <small><LocateFixed size={14}/>{'Ponto de partida: '}<b>{origin.name}</b></small>}
          </div>
        </section>

        <section className="ras-list-panel" aria-labelledby="ras-list-heading">
          <div className="ras-list-heading">
            <div>
              <span className="ras-list-kicker"><Navigation size={15}/>{'LOCAIS DA UNIDADE'}</span>
              <h2 id="ras-list-heading">{'Escolha seu destino'}</h2>
              <p>{'Toque no local desejado para abrir o mapa e a rota.'}</p>
            </div>
            <div className="ras-list-routes-count"><Route size={16}/>{routedCount} {routedCount === 1 ? 'caminho publicado' : 'caminhos publicados'}</div>
          </div>

          {destinations.length > 3 && (
            <label className="ras-list-search">
              <Search size={20}/>
              <input type="search" placeholder={'Buscar f\u00e1brica, escrit\u00f3rio, barreira...'} value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar destino"/>
            </label>
          )}

          <div className="ras-location-list">
            {results.map(point => {
              const category = CATEGORY[point.category] || CATEGORY.outros;
              const distance = destinationDistance(point);
              return (
                <Link className="ras-location-card" key={point.id} to={destinationPath(slug, point.id)} aria-label={`Abrir mapa para ${point.name}`}>
                  <span className="ras-location-icon" style={{ '--ras-category': category.color }} aria-hidden="true">{category.icon}</span>
                  <span className="ras-location-copy">
                    <strong>{point.name}</strong>
                    <span className="ras-location-category">{category.label}</span>
                    {point.description && <small>{point.description}</small>}
                  </span>
                  <span className="ras-location-action">
                    <span className={`ras-location-route ${distance ? 'has-route' : 'no-route'}`}>
                      {distance ? <><CheckCircle2 size={14}/>{distance} {'de percurso'}</> : <><CircleAlert size={14}/>{'Sem caminho desenhado'}</>}
                    </span>
                    <span className="ras-location-view">{'Ver no mapa'}<ChevronRight size={18}/></span>
                  </span>
                </Link>
              );
            })}
            {!destinations.length && <div className="ras-list-empty"><MapPin size={26}/><strong>{'Nenhum destino publicado'}</strong><span>{'A unidade ainda n\u00e3o disponibilizou localiza\u00e7\u00f5es para visitantes.'}</span></div>}
            {!!destinations.length && !results.length && <div className="ras-list-empty"><Search size={25}/><strong>{'Nenhum local encontrado'}</strong><span>{'Tente outro nome na busca.'}</span></div>}
          </div>
        </section>

        <section className="ras-list-instructions">
          <div className="ras-list-instruction-symbol"><ShieldCheck size={21}/></div>
          <p><strong>{'Navega\u00e7\u00e3o segura.'}</strong> {'Ap\u00f3s escolher um local, seu celular poder\u00e1 solicitar permiss\u00e3o de GPS. Os caminhos seguem as vias internas desenhadas pela RAS Company. Respeite a sinaliza\u00e7\u00e3o e as barreiras de acesso.'}</p>
        </section>
      </main>
      <footer className="ras-visitor-bottom"><img src="/ras-company-logo.png" alt=""/><span>{'RAS Company \u00b7 Guia de visitantes'}</span><span>{'\u00a9 2026'}</span></footer>
    </div>
  );
}
