import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPinned, ArrowRight, ShieldCheck } from 'lucide-react';
import { Brand } from '../components/Brand.jsx';

export function PublicHomePage() {
  const [units, setUnits] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/public-data/units.json', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Lista de unidades nao encontrada. Verifique a exportacao dos dados.');
        const data = await response.json();
        if (!Array.isArray(data.units)) throw new Error('Dados de unidades invalidos.');
        setUnits(data.units);
      })
      .catch(err => setError(err.message));
  }, []);
  return (
    <div className="home-page">
      <div className="home-topbar"><Brand home/><span className="eyebrow">ACESSO A VISITANTES</span></div>
      <main className="home-shell">
        <div className="eyebrow green">MAPA DE LOCALIZACAO</div>
        <h1>RAS Company<br/><span>Rotas e Visitantes.</span></h1>
        <p>Selecione sua unidade para visualizar os destinos e seguir os caminhos internos autorizados.</p>
        {error && <p role="alert">{error}</p>}
        <div style={{display:'grid',gap:12,maxWidth:620}}>
          {units.map(unit => (
            <Link key={unit.slug} to={`/v/${unit.slug}`} className="btn btn-primary btn-large" style={{justifyContent:'space-between',textDecoration:'none'}}>
              <span style={{display:'flex',gap:12,alignItems:'center'}}><MapPinned size={20}/>{unit.name}</span><ArrowRight size={18}/>
            </Link>
          ))}
        </div>
        <div className="home-features">
          <div><span className="feature-symbol"><MapPinned size={22}/></span><strong>Mapa da unidade</strong><small>Pontos e destinos autorizados</small></div>
          <div><span className="feature-symbol"><ShieldCheck size={22}/></span><strong>Navegacao segura</strong><small>Permita GPS para acompanhar o percurso</small></div>
        </div>
      </main>
      <footer className="home-footer">RAS Company Rotas · Acesso de visitantes</footer>
    </div>
  );
}
