import React from 'react';
import { Link } from 'react-router-dom';

export function Brand({ compact = false, home = false, light = false }) {
  const content = <>
    <img className="ras-brand-symbol" src="/ras-company-logo.png" alt="Símbolo RAS Company" />
    <span className="ras-brand-words"><strong>RAS <span>Company</span></strong><small>{compact ? 'ROTAS · VISITANTES' : 'ROTAS · GUIA DE VISITANTES'}</small></span>
  </>;
  return home
    ? <Link className={`ras-brand ${compact ? 'compact' : ''} ${light ? 'light' : ''}`} to="/" aria-label="RAS Company Rotas, página inicial">{content}</Link>
    : <div className={`ras-brand ${compact ? 'compact' : ''} ${light ? 'light' : ''}`}>{content}</div>;
}
