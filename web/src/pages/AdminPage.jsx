import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Clipboard, Compass, Copy,
  Download, Edit3, ExternalLink, Eye, EyeOff, Factory, FilePenLine, KeyRound,
  Layers3, LocateFixed, LogOut, MapPin, Menu, Navigation, Plus, Printer, QrCode,
  Save, Settings2, ShieldCheck, Trash2, Route, X,
} from 'lucide-react';
import { adminRequest, bodyJson, loginAdmin } from '../api.js';
import { CATEGORY, coord, FALLBACK_CENTER } from '../constants.js';
import { PlaceMap } from '../components/PlaceMap.jsx';
import { RoutesEditor } from './RoutesEditor.jsx';
import { Brand } from '../components/Brand.jsx';

const emptyUnit = () => ({ name: '', slug: '', description: '', centerLat: String(FALLBACK_CENTER[0]), centerLng: String(FALLBACK_CENTER[1]), active: true });
const emptyPoint = () => ({ name: '', category: 'fabrica', description: '', lat: '', lng: '', sortOrder: 0, active: true, isOrigin: false });
const slugify = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function InfoToast({ notice, onClear }) {
  if (!notice) return null;
  return <div className={`toast ${notice.type === 'error' ? 'toast-error' : ''}`} role="status"><span>{notice.type === 'error' ? <X size={17}/> : <CheckCircle2 size={17}/>}</span><p>{notice.text}</p><button onClick={onClear} aria-label="Fechar mensagem"><X size={16}/></button></div>;
}

function Login({ onLogin }) {
  const [entry, setEntry] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await onLogin(entry); } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return (
    <div className="admin-login-page">
      <Link to="/" className="login-back"><ArrowLeft size={17}/> Voltar ao início</Link>
      <div className="login-card">
        <div className="ras-login-brand"><Brand /></div>
        <div className="eyebrow green">AMBIENTE DE CONFIGURAÇÃO</div>
        <h1>Central de Rotas</h1>
        <p>Cadastre unidades, pontos e caminhos internos, e gere o QR Code para visitantes.</p>
        <form onSubmit={submit}>
          <label htmlFor="admin-password">Senha administrativa local</label>
          <div className="password-field">
            <KeyRound size={17}/>
            <input id="admin-password" autoFocus type={show ? 'text' : 'password'} placeholder="Digite a senha configurada no script" value={entry} onChange={e => setEntry(e.target.value)} required />
            <button type="button" title="Mostrar/ocultar senha" onClick={() => setShow(v => !v)}>{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={busy} className="btn btn-primary btn-block btn-large">{busy ? 'Validando...' : 'Entrar no painel'} <ArrowRight size={17}/></button>
        </form>
        <div className="login-security"><ShieldCheck size={19}/><span>Ambiente local de desenvolvimento. O acesso administrativo será integrado ao login da Intranet antes da publicação.</span></div>
      </div>
    </div>
  );
}

function InputField({ label, children, small = false, hint }) {
  return <label className={`field ${small ? 'field-small' : ''}`}><span>{label}</span>{children}{hint && <small className="field-hint">{hint}</small>}</label>;
}

function EmptyUnit({ onCreate }) {
  return <div className="big-empty"><span className="empty-illustration"><Factory size={39}/></span><h2>Comece cadastrando sua unidade</h2><p>Cadastre o nome da fazenda ou instalação. Depois, marque a balança, a fábrica, o escritório e os demais pontos.</p><button className="btn btn-primary" onClick={onCreate}><Plus size={18}/> Cadastrar primeira unidade</button></div>;
}

export function AdminPage() {
  const [password, setPassword] = useState('');
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [points, setPoints] = useState([]);
  const [tab, setTab] = useState('pontos');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pointDraft, setPointDraft] = useState(emptyPoint);
  const [editingPointId, setEditingPointId] = useState(null);
  const [unitDraft, setUnitDraft] = useState(emptyUnit);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [qrBase, setQrBase] = useState(() => window.localStorage.getItem('ras_mapa_qr_base') || window.location.origin);
  const [qrImage, setQrImage] = useState('');
  const [adminGps, setAdminGps] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const unit = units.find(u => u.id === selectedUnitId);
  const published = points.filter(p => p.active);
  const initialPoint = published.find(p => p.isOrigin);
  const center = unit ? [unit.centerLat, unit.centerLng] : FALLBACK_CENTER;
  const draftMarker = pointDraft.lat !== '' && pointDraft.lng !== '' && Number.isFinite(Number(pointDraft.lat)) && Number.isFinite(Number(pointDraft.lng))
    ? { lat: Number(pointDraft.lat), lng: Number(pointDraft.lng) } : null;
  const currentLink = useMemo(() => {
    if (!unit) return '';
    let base = qrBase.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(base)) return '';
    try { new URL(base); } catch { return ''; }
    return `${base}/v/${unit.slug}`;
  }, [qrBase, unit?.slug]);

  useEffect(() => {
    window.localStorage.setItem('ras_mapa_qr_base', qrBase);
  }, [qrBase]);
  useEffect(() => {
    if (!currentLink) { setQrImage(''); return; }
    let alive = true;
    QRCode.toDataURL(currentLink, { width: 640, margin: 2, color: { dark: '#253c27', light: '#ffffff' }, errorCorrectionLevel: 'H' })
      .then(url => { if (alive) setQrImage(url); })
      .catch(() => { if (alive) setQrImage(''); });
    return () => { alive = false; };
  }, [currentLink]);

  function showError(err) { setNotice({ type: 'error', text: err.message || String(err) }); }
  function showSuccess(text) { setNotice({ type: 'success', text }); }

  async function loadUnits(pass, preferredId = '') {
    const result = await adminRequest(pass, '/api/admin/units');
    setUnits(result.units);
    const chosen = result.units.some(u => u.id === preferredId) ? preferredId : (result.units[0]?.id || '');
    setSelectedUnitId(chosen);
    if (chosen) await loadPoints(pass, chosen);
    else setPoints([]);
    return chosen;
  }
  async function loadPoints(pass, id) {
    const result = await adminRequest(pass, `/api/admin/units/${id}/points`);
    setPoints(result.points);
  }
  async function login(value) {
    await loginAdmin(value);
    await loadUnits(value);
    setPassword(value);
  }
  async function changeUnit(id) {
    setSelectedUnitId(id);
    setEditingPointId(null);
    setPointDraft(emptyPoint());
    setAdminGps(null);
    try { await loadPoints(password, id); } catch (err) { showError(err); }
  }

  function startNewUnit() {
    setEditingUnitId(null); setUnitDraft(emptyUnit()); setTab('unidades'); setMobileMenu(false);
  }
  function startEditUnit() {
    if (!unit) return;
    setEditingUnitId(unit.id);
    setUnitDraft({ name: unit.name, slug: unit.slug, description: unit.description || '', centerLat: String(unit.centerLat), centerLng: String(unit.centerLng), active: unit.active });
    setTab('unidades'); setMobileMenu(false);
  }
  async function saveUnit(e) {
    e.preventDefault(); setBusy(true); setNotice(null);
    const payload = { ...unitDraft, centerLat: unitDraft.centerLat === '' ? null : Number(unitDraft.centerLat), centerLng: unitDraft.centerLng === '' ? null : Number(unitDraft.centerLng) };
    try {
      const endpoint = editingUnitId ? `/api/admin/units/${editingUnitId}` : '/api/admin/units';
      const result = await adminRequest(password, endpoint, { method: editingUnitId ? 'PUT' : 'POST', body: bodyJson(payload) });
      await loadUnits(password, result.unit.id);
      setEditingUnitId(null); setUnitDraft(emptyUnit()); setTab('pontos');
      showSuccess('Unidade salva. Agora marque as localizações no mapa.');
    } catch (err) { showError(err); } finally { setBusy(false); }
  }
  async function deleteUnit() {
    if (!unit || !window.confirm(`Excluir a unidade "${unit.name}" e TODOS os seus pontos? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    try {
      await adminRequest(password, `/api/admin/units/${unit.id}`, { method: 'DELETE' });
      await loadUnits(password);
      setEditingUnitId(null); setUnitDraft(emptyUnit()); setPointDraft(emptyPoint()); setEditingPointId(null);
      showSuccess('Unidade excluída.');
    } catch (err) { showError(err); } finally { setBusy(false); }
  }

  function startNewPoint() { setEditingPointId(null); setPointDraft(emptyPoint()); setTab('pontos'); setNotice(null); }
  function editPoint(point) {
    setEditingPointId(point.id);
    setPointDraft({ name: point.name, category: point.category, description: point.description || '', lat: String(point.lat), lng: String(point.lng), sortOrder: point.sortOrder || 0, active: point.active, isOrigin: point.isOrigin });
    setTab('pontos');
  }
  function pickPoint(position) {
    setPointDraft(prev => ({ ...prev, lat: position.lat.toFixed(7), lng: position.lng.toFixed(7) }));
  }
  function adminLocate() {
    if (!navigator.geolocation) { showError(new Error('GPS indisponível neste navegador.')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        pickPoint(coords); setAdminGps(coords);
        showSuccess('Coordenadas capturadas. Confira o marcador e clique em Salvar local.');
      },
      () => showError(new Error('Não foi possível acessar o GPS. Permita a localização e utilize HTTPS no celular ou localhost no computador.')),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }
  async function savePoint(e) {
    e.preventDefault(); if (!unit) return;
    setBusy(true); setNotice(null);
    const payload = {
      ...pointDraft,
      lat: pointDraft.lat === '' ? null : Number(pointDraft.lat),
      lng: pointDraft.lng === '' ? null : Number(pointDraft.lng),
      sortOrder: Number(pointDraft.sortOrder || 0),
    };
    try {
      const endpoint = editingPointId ? `/api/admin/points/${editingPointId}` : `/api/admin/units/${unit.id}/points`;
      await adminRequest(password, endpoint, { method: editingPointId ? 'PUT' : 'POST', body: bodyJson(payload) });
      await loadPoints(password, unit.id);
      setPointDraft(emptyPoint()); setEditingPointId(null);
      showSuccess('Local salvo e disponível conforme a opção "Exibir para visitantes".');
    } catch (err) { showError(err); } finally { setBusy(false); }
  }
  async function deletePoint(point) {
    if (!window.confirm(`Excluir o local "${point.name}"?`)) return;
    setBusy(true);
    try {
      await adminRequest(password, `/api/admin/points/${point.id}`, { method: 'DELETE' });
      await loadPoints(password, unit.id);
      if (editingPointId === point.id) startNewPoint();
      showSuccess('Local excluído.');
    } catch (err) { showError(err); } finally { setBusy(false); }
  }
  async function toggleVisibility(point) {
    try {
      await adminRequest(password, `/api/admin/points/${point.id}`, { method: 'PUT', body: bodyJson({ ...point, active: !point.active }) });
      await loadPoints(password, unit.id);
      showSuccess(point.active ? 'Local ocultado para visitantes.' : 'Local publicado no mapa de visitantes.');
    } catch (err) { showError(err); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(currentLink); showSuccess('Link copiado.'); }
    catch { showError(new Error('Não foi possível copiar automaticamente. Selecione e copie o link abaixo.')); }
  }

  if (!password) return <Login onLogin={login} />;
  const navItems = [
    { key: 'pontos', title: 'Locais no mapa', icon: <MapPin size={19}/> },
    { key: 'rotas', title: 'Caminhos internos', icon: <Route size={19}/> },
    { key: 'unidades', title: 'Unidades', icon: <Building2 size={19}/> },
    { key: 'qrcode', title: 'QR Code e link', icon: <QrCode size={19}/> },
  ];
  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
        <div className="admin-brand"><Brand compact light /></div>
        <div className="sidebar-section">GERENCIAMENTO</div>
        <nav className="admin-nav">
          {navItems.map(item => <button key={item.key} className={tab === item.key ? 'nav-item active' : 'nav-item'} onClick={() => { setTab(item.key); setMobileMenu(false); }}><span>{item.icon}</span>{item.title}</button>)}
        </nav>
        <div className="sidebar-spacer"/>
        <div className="sidebar-security"><ShieldCheck size={18}/> Acesso administrativo local</div>
        <button className="sidebar-logout" onClick={() => { setPassword(''); setUnits([]); setPoints([]); }}><LogOut size={17}/> Sair</button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="mobile-menu-trigger" onClick={() => setMobileMenu(v => !v)} aria-label="Menu"><Menu size={20}/></button>
          <div><div className="eyebrow green">PAINEL DE CONTROLE</div><h1>Central de Rotas</h1></div>
          <div className="admin-top-actions"><span className="admin-local-badge"><span className="status-dot"/> Ambiente local</span><Link to="/" className="icon-circle" title="Início"><ArrowLeft size={19}/></Link></div>
        </header>
        <div className="admin-content">
          <InfoToast notice={notice} onClear={() => setNotice(null)} />
          <div className="unit-toolbar">
            <div className="unit-picker"><span>UNIDADE SELECIONADA</span><div className="unit-picker-row"><Building2 size={18}/><select aria-label="Escolher unidade" value={selectedUnitId} onChange={e => changeUnit(e.target.value)} disabled={!units.length}>{units.length ? units.map(u => <option key={u.id} value={u.id}>{u.name}{u.active ? '' : ' (inativa)'}</option>) : <option value="">Cadastre uma unidade</option>}</select></div></div>
            <button className="btn btn-outline" onClick={startNewUnit}><Plus size={17}/> Nova unidade</button>
            {unit && <button className="btn btn-outline" onClick={() => window.open(`/v/${unit.slug}`, '_blank', 'noopener,noreferrer')}><ExternalLink size={16}/> Ver página pública</button>}
          </div>
          {!units.length && tab !== 'unidades' ? <EmptyUnit onCreate={startNewUnit} /> : null}

          {tab === 'pontos' && unit && <>
            <div className="stats-grid">
              <div className="stat"><span><Layers3 size={18}/></span><strong>{points.length}</strong><small>Locais cadastrados</small></div>
              <div className="stat"><span><CheckCircle2 size={18}/></span><strong>{published.length}</strong><small>Visíveis para visitantes</small></div>
              <div className="stat"><span><Navigation size={18}/></span><strong>{initialPoint ? 'Definido' : 'Pendente'}</strong><small>Ponto inicial (balança)</small></div>
            </div>
            <div className="section-header"><div><div className="eyebrow green">CADASTRO GEOGRÁFICO</div><h2>Locais da unidade</h2><p>Clique no mapa para definir a posição. Você também pode arrastar o marcador laranja.</p></div><button className="btn btn-light" onClick={startNewPoint}><Plus size={17}/> Novo local</button></div>
            <div className="admin-workspace">
              <section className="admin-map-card card-panel">
                <div className="map-topline"><span><span className="status-dot"/> Mapa de edição</span><span>Clique para marcar um local</span></div>
                <div className="map-area admin-map-area"><PlaceMap key={unit.id} points={points.filter(p => p.id !== editingPointId)} center={center} selectedId={null} draft={draftMarker} draggableDraft={true} onPick={pickPoint} onSelect={editPoint} fitKey={`${unit.id}:${points.map(p => `${p.id}:${p.lat}:${p.lng}`).join(',')}`} /></div>
                <div className="map-footer-tool"><span><MapPin size={15}/> {draftMarker ? `${coord(draftMarker.lat)}, ${coord(draftMarker.lng)}` : 'Marque um ponto para começar'}</span><button type="button" onClick={adminLocate}><LocateFixed size={16}/> Capturar GPS</button></div>
              </section>
              <section className="point-form-card card-panel">
                <div className="form-card-title"><span className="form-icon"><FilePenLine size={19}/></span><div><h3>{editingPointId ? 'Editar localização' : 'Nova localização'}</h3><small>Informações exibidas no mapa público</small></div></div>
                <form onSubmit={savePoint} className="edit-form">
                  <InputField label="Nome do local"><input required maxLength={90} placeholder="Ex.: Fábrica de Ração" value={pointDraft.name} onChange={e => setPointDraft(v => ({ ...v, name: e.target.value }))}/></InputField>
                  <InputField label="Categoria"><select value={pointDraft.category} onChange={e => setPointDraft(v => ({ ...v, category: e.target.value }))}>{Object.entries(CATEGORY).map(([key, meta]) => <option key={key} value={key}>{meta.icon} {meta.label}</option>)}</select></InputField>
                  <InputField label="Descrição (opcional)"><textarea rows={2} maxLength={300} placeholder="Ex.: Entrada pela portaria principal, seguir placas." value={pointDraft.description} onChange={e => setPointDraft(v => ({ ...v, description: e.target.value }))}/></InputField>
                  <div className="two-fields">
                    <InputField label="Latitude" small><input type="number" required step="any" min="-90" max="90" placeholder="-20.000000" value={pointDraft.lat} onChange={e => setPointDraft(v => ({ ...v, lat: e.target.value }))}/></InputField>
                    <InputField label="Longitude" small><input type="number" required step="any" min="-180" max="180" placeholder="-48.000000" value={pointDraft.lng} onChange={e => setPointDraft(v => ({ ...v, lng: e.target.value }))}/></InputField>
                  </div>
                  <div className="field-hint marker-hint"><MapPin size={14}/> Clique no mapa ou use Capturar GPS para preencher as coordenadas.</div>
                  <InputField label="Ordem de exibição" small><input type="number" min="-100000" max="100000" value={pointDraft.sortOrder} onChange={e => setPointDraft(v => ({ ...v, sortOrder: e.target.value }))}/></InputField>
                  <label className="check-field"><input type="checkbox" checked={pointDraft.active} onChange={e => setPointDraft(v => ({ ...v, active: e.target.checked }))}/><span><strong>Exibir para visitantes</strong><small>Publicar na lista e no mapa do QR Code</small></span></label>
                  <label className="check-field"><input type="checkbox" checked={pointDraft.isOrigin} onChange={e => setPointDraft(v => ({ ...v, isOrigin: e.target.checked }))}/><span><strong>Definir como ponto inicial</strong><small>Recomendado para a balança onde ficará o QR Code</small></span></label>
                  <div className="form-actions"><button className="btn btn-light" type="button" onClick={startNewPoint}>Limpar</button><button className="btn btn-primary" disabled={busy} type="submit"><Save size={17}/> {busy ? 'Salvando...' : 'Salvar local'}</button></div>
                </form>
              </section>
            </div>
            <section className="list-section card-panel">
              <div className="list-header"><div><h3>Localizações cadastradas</h3><small>Selecione uma linha para editar a posição e as informações.</small></div><span className="pill-count">{points.length} {points.length === 1 ? 'local' : 'locais'}</span></div>
              {!points.length ? <div className="empty-list roomy"><MapPin size={27}/><p>Nenhuma localização cadastrada ainda.</p><span>Marque o primeiro ponto no mapa e salve.</span></div> :
                <div className="admin-points-list">{points.map(point => (
                  <div key={point.id} className={`admin-point-row ${editingPointId === point.id ? 'being-edited' : ''}`}>
                    <span className="location-emoji" style={{ background: `${CATEGORY[point.category]?.color || '#64756b'}20` }}>{CATEGORY[point.category]?.icon || '📍'}</span>
                    <div className="admin-point-info"><strong>{point.name}{point.isOrigin && <span className="origin-label">Ponto inicial</span>}</strong><small>{CATEGORY[point.category]?.label} · {coord(point.lat)}, {coord(point.lng)}</small></div>
                    <span className={`visibility-pill ${point.active ? 'visible' : ''}`}>{point.active ? 'Publicado' : 'Oculto'}</span>
                    <div className="row-actions">
                      <button type="button" onClick={() => toggleVisibility(point)} title={point.active ? 'Ocultar para visitantes' : 'Publicar'}>{point.active ? <Eye size={17}/> : <EyeOff size={17}/>}</button>
                      <button type="button" onClick={() => { editPoint(point); window.scrollTo({ top: 180, behavior: 'smooth' }); }} title="Editar"><Edit3 size={17}/></button>
                      <button type="button" className="danger" onClick={() => deletePoint(point)} title="Excluir"><Trash2 size={17}/></button>
                    </div>
                  </div>
                ))}</div>}
            </section>
          </>}

          {tab === 'rotas' && unit && <RoutesEditor key={unit.id} unit={unit} points={points} center={center} password={password} onReload={() => loadPoints(password, unit.id)}/>}

          {tab === 'unidades' && <div className="unit-settings-grid">
            <section className="settings-card card-panel"><div className="section-header compact"><div><div className="eyebrow green">CONFIGURAÇÃO</div><h2>{editingUnitId ? 'Editar unidade' : 'Cadastrar unidade'}</h2><p>Defina o nome e a região que aparecerá primeiro no mapa.</p></div></div>
              <form onSubmit={saveUnit} className="edit-form unit-form">
                <InputField label="Nome da unidade"><input required placeholder="Ex.: Fazenda São Pedro" value={unitDraft.name} onChange={e => setUnitDraft(v => ({ ...v, name: e.target.value, slug: editingUnitId ? v.slug : slugify(e.target.value) }))}/></InputField>
                <InputField label="Identificador do link" hint="Exemplo: fazenda-sao-pedro. Evite alterar depois de imprimir o QR Code."><div className="input-prefix"><span>/v/</span><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="fazenda-sao-pedro" value={unitDraft.slug} onChange={e => setUnitDraft(v => ({ ...v, slug: slugify(e.target.value) }))}/></div></InputField>
                <InputField label="Descrição para visitantes"><textarea rows={3} maxLength={300} placeholder="Bem-vindo! Selecione um destino para receber orientações." value={unitDraft.description} onChange={e => setUnitDraft(v => ({ ...v, description: e.target.value }))}/></InputField>
                <div className="two-fields"><InputField label="Latitude do centro" small><input type="number" required step="any" min="-90" max="90" value={unitDraft.centerLat} onChange={e => setUnitDraft(v => ({ ...v, centerLat: e.target.value }))}/></InputField><InputField label="Longitude do centro" small><input type="number" required step="any" min="-180" max="180" value={unitDraft.centerLng} onChange={e => setUnitDraft(v => ({ ...v, centerLng: e.target.value }))}/></InputField></div>
                <div className="field-hint">O centro inicial é apenas um valor genérico de demonstração. Substitua pelas coordenadas reais da unidade ou ajuste após cadastrar o primeiro ponto.</div>
                <label className="check-field"><input type="checkbox" checked={unitDraft.active} onChange={e => setUnitDraft(v => ({ ...v, active: e.target.checked }))}/><span><strong>Unidade ativa</strong><small>Permite que o QR Code abra o mapa público</small></span></label>
                <div className="form-actions"><button type="button" className="btn btn-light" onClick={() => { setUnitDraft(emptyUnit()); setEditingUnitId(null); }}>Limpar</button><button type="submit" className="btn btn-primary" disabled={busy}><Save size={17}/>{busy ? 'Salvando...' : 'Salvar unidade'}</button></div>
              </form>
            </section>
            <aside className="unit-side card-panel"><div className="side-icon"><Building2 size={23}/></div><h3>Unidades cadastradas</h3><p>Cada unidade possui seus próprios pontos, mapa e QR Code.</p><div className="unit-mini-list">{!units.length && <div className="empty-list">Nenhuma unidade cadastrada.</div>}{units.map(u => <button key={u.id} className={u.id === selectedUnitId ? 'mini-unit active' : 'mini-unit'} onClick={() => changeUnit(u.id)}><Factory size={17}/><span><strong>{u.name}</strong><small>{u.pointCount} locais · /v/{u.slug}</small></span>{u.id === selectedUnitId && <Check size={16}/>}</button>)}</div>
              {unit && <><button className="btn btn-outline btn-block" onClick={startEditUnit}><Settings2 size={16}/> Editar unidade selecionada</button><button className="btn btn-danger-light btn-block" onClick={deleteUnit}><Trash2 size={16}/> Excluir unidade selecionada</button></>}
            </aside>
          </div>}

          {tab === 'qrcode' && unit && <div className="qr-layout">
            <section className="qr-settings card-panel"><div className="eyebrow green">ACESSO PARA VISITANTES</div><h2>QR Code da unidade</h2><p>Imprima e fixe na balança. O QR Code mantém o mesmo link mesmo quando os pontos forem alterados.</p>
              <InputField label="Endereço base do site" hint="Para testar GPS no celular, cole aqui o domínio HTTPS temporário gerado pelo script 05. HTTP por IP não libera localização."><input value={qrBase} onChange={e => setQrBase(e.target.value)} placeholder="https://meu-link-temporario.trycloudflare.com"/></InputField>
              <InputField label="Link completo"><div className="link-copy"><input aria-label="Link público" readOnly value={currentLink}/><button title="Copiar link" type="button" disabled={!currentLink} onClick={copyLink}><Copy size={17}/></button></div></InputField>
              {((/localhost|127\.0\.0\.1/i).test(qrBase) || qrBase.trim().startsWith('http:')) && <div className="banner-warn">Atenção: localhost só abre no próprio computador. Para GPS no celular use o link HTTPS do script 05, sem localhost nem IP HTTP.</div>}
              {!unit.active && <div className="banner-warn">Esta unidade está inativa. O link público não exibirá o mapa enquanto estiver desativada.</div>}
              {!published.length && <div className="banner-warn">Não existem pontos publicados. Cadastre os locais antes de disponibilizar o QR Code.</div>}
              <div className="qr-actions"><button type="button" className="btn btn-outline" disabled={!currentLink} onClick={() => window.open(currentLink, '_blank', 'noopener,noreferrer')}><ExternalLink size={17}/> Testar link</button><button className="btn btn-primary" disabled={!qrImage} onClick={() => window.print()}><Printer size={17}/> Imprimir placa</button></div>
              <div className="qr-help"><ShieldCheck size={19}/><span>O visitante só tem acesso de leitura. Cadastro e edição exigem senha na área administrativa.</span></div>
            </section>
            <div className="qr-preview card-panel">
              <div className="qr-poster">
                <div className="poster-brand"><img src="/ras-company-logo.png" alt="Logo RAS Company"/><span>RAS COMPANY · ROTAS</span></div>
                <div className="poster-kicker">LOCALIZAÇÃO E NAVEGAÇÃO</div>
                <h2>Encontre seu<br/>destino na unidade</h2>
                <p>Aponte a câmera do celular para o QR Code e acesse nosso mapa.</p>
                <div className="qr-code-frame">{qrImage ? <img src={qrImage} alt={`QR Code para ${unit.name}`}/> : <span>Informe um link HTTP ou HTTPS válido.</span>}</div>
                <div className="poster-location"><MapPin size={18}/> {unit.name}</div>
                <div className="poster-footer">FÁBRICA · ESCRITÓRIO · BARREIRAS</div>
              </div>
              {qrImage && <a className="btn btn-outline btn-block qr-download" href={qrImage} download={`QRCode_${unit.slug}.png`}><Download size={17}/> Baixar QR Code em PNG</a>}
            </div>
          </div>}
          {tab === 'qrcode' && !unit && <EmptyUnit onCreate={startNewUnit}/>}
        </div>
      </main>
    </div>
  );
}
