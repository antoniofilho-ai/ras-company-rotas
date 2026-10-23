import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, MapPinned, QrCode, ShieldCheck } from 'lucide-react';
import { Brand } from '../components/Brand.jsx';

export function HomePage() {
  return (
    <div className="home-page">
      <div className="home-topbar"><Brand home/><span className="eyebrow">PAINEL LOCAL · V4</span></div>
      <main className="home-shell">
        <div className="eyebrow green">SISTEMA DE LOCALIZAÇÃO</div>
        <h1>RAS Company<br /><span>Rotas e Visitantes.</span></h1>
        <p>Cadastre os destinos, desenhe as estradas internas no Google Maps e gere o QR Code da balança. O visitante acompanha seu caminho pelo GPS.</p>
        <Link to="/admin" className="btn btn-primary btn-large">Abrir administração <ArrowRight size={18} /></Link>
        <div className="home-features">
          <div><span className="feature-symbol"><MapPinned size={22}/></span><strong>Locais no mapa</strong><small>Marque e edite pontos pelo mapa</small></div>
          <div><span className="feature-symbol"><QrCode size={22}/></span><strong>QR Code por unidade</strong><small>Link permanente para visitantes</small></div>
          <div><span className="feature-symbol"><Compass size={22}/></span><strong>Caminhos internos</strong><small>Traçado manual por estrada privada, com GPS</small></div>
          <div><span className="feature-symbol"><ShieldCheck size={22}/></span><strong>Cadastro protegido</strong><small>Visitante só vê locais publicados</small></div>
        </div>
      </main>
      <footer className="home-footer">RAS Company Rotas · Versão 4.0 · Ambiente de desenvolvimento local</footer>
    </div>
  );
}
