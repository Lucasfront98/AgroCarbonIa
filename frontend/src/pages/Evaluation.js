import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { evaluationService } from '../services/api';
import FarmMap from '../components/FarmMap';

// -------------------------------------------------------
// Badge: "Dado Real" (verde) ou "Simulação" (cinza)
// -------------------------------------------------------
const DataSourceBadge = ({ isReal, label }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.2rem 0.6rem',
      fontSize: '0.68rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      border: `1px solid ${isReal ? 'var(--green)' : 'var(--muted)'}`,
      color: isReal ? 'var(--green)' : 'var(--muted)',
      backgroundColor: 'transparent',
    }}
    className="font-mono"
  >
    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isReal ? 'var(--green)' : 'var(--muted)', display: 'inline-block' }} />
    {isReal ? 'Dado Real' : 'Simulação'}
    {label && ` · ${label}`}
  </span>
);

// -------------------------------------------------------
// Faixa de preço com barra de gradiente
// -------------------------------------------------------
const PriceRange = ({ low, mid, high, currency = 'USD' }) => {
  const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 0 });
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
        <span>Sem certificação</span>
        <span>Verra / Gold Standard</span>
      </div>
      <div style={{ position: 'relative', height: '6px', borderRadius: '3px', background: 'linear-gradient(to right, #555, var(--gold), var(--green))', marginBottom: '0.5rem' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{currency} {fmt(low)}</span>
        <span className="font-mono" style={{ fontSize: '1rem', color: 'var(--gold)', fontWeight: 700 }}>{currency} {fmt(mid)}</span>
        <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--green)' }}>{currency} {fmt(high)}</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: '0.2rem' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>▲ referência conservadora</span>
      </div>
    </div>
  );
};

const Evaluation = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Form Fields
  const [propName, setPropName] = useState('');
  const [state, setState] = useState('MT');
  const [area, setArea] = useState(0);
  const [vegetation, setVegetation] = useState('60-80% pastagem+reserva');
  const [landUse, setLandUse] = useState('Agropecuária com reserva');

  // UI State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Mapa sempre aberto por padrão
  const [polygonGeoJSON, setPolygonGeoJSON] = useState(null);
  const [externalPolygon, setExternalPolygon] = useState(null);

  // CAR / SICAR
  const [carNumber, setCarNumber] = useState('');
  const [carLoading, setCarLoading] = useState(false);
  const [carError, setCarError] = useState('');
  const [carFound, setCarFound] = useState(false);

  useEffect(() => {
    if (location.state) {
      if (location.state.state) setState(location.state.state);
      if (location.state.area) setArea(location.state.area);
      if (location.state.vegetation) setVegetation(location.state.vegetation);
      if (location.state.landUse) setLandUse(location.state.landUse);
      setLoading(true);
      evaluationService.evaluate({
        state: location.state.state,
        area_ha: location.state.area,
        vegetation_cover: location.state.vegetation,
        land_use: location.state.landUse
      }).then((res) => setResult(res.data ? res.data : res))
        .finally(() => setLoading(false));
    }
  }, [location.state]);

  const handlePolygonChange = (geojson) => {
    setPolygonGeoJSON(geojson);
    if (!geojson) { setArea(0); return; }
    evaluationService.analyzeFarm(geojson).then((res) => {
      const data = res.data ? res.data : res;
      if (data?.metrics) setArea(Math.round(data.metrics.area_ha));
    }).catch(() => {});
  };

  const handleFetchCar = async () => {
    if (!carNumber.trim()) return;
    setCarLoading(true);
    setCarError('');
    setCarFound(false);
    try {
      const res = await evaluationService.fetchCar(carNumber.trim());
      const data = res.data ? res.data : res;
      if (data?.geojson) {
        setExternalPolygon(data.geojson);
        setCarFound(true);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'CAR não encontrado. Verifique o número e tente novamente.';
      setCarError(msg);
    } finally {
      setCarLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      let res;
      if (polygonGeoJSON) {
        res = await evaluationService.analyzeFarm(polygonGeoJSON);
      } else {
        res = await evaluationService.evaluate({ state, area_ha: area, vegetation_cover: vegetation, land_use: landUse });
      }
      setResult(res.data ? res.data : res);
    } catch {
      alert('Erro na avaliação.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!isAuthenticated) return;
    setDownloading(true);
    try {
      const response = await evaluationService.generateMrvReport({
        propertyName: propName || 'Fazenda Analisada', state, area, vegetation, landUse,
        tons_co2: result.tons_co2,
        estimated_value_brl: result.estimated_value_brl,
        ndvi_score: result.ndvi_score,
        mrv_eligibility_pct: result.mrv_eligibility_pct
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laudo_MRV_${(propName || 'Fazenda').replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert('Ocorreu um erro ao gerar o laudo.');
    } finally {
      setDownloading(false);
    }
  };

  const BR_STATES = [
    { code: 'AC', name: 'Acre' }, { code: 'AL', name: 'Alagoas' }, { code: 'AP', name: 'Amapá' },
    { code: 'AM', name: 'Amazonas' }, { code: 'BA', name: 'Bahia' }, { code: 'CE', name: 'Ceará' },
    { code: 'DF', name: 'Distrito Federal' }, { code: 'ES', name: 'Espírito Santo' }, { code: 'GO', name: 'Goiás' },
    { code: 'MA', name: 'Maranhão' }, { code: 'MT', name: 'Mato Grosso' }, { code: 'MS', name: 'Mato Grosso do Sul' },
    { code: 'MG', name: 'Minas Gerais' }, { code: 'PA', name: 'Pará' }, { code: 'PB', name: 'Paraíba' },
    { code: 'PR', name: 'Paraná' }, { code: 'PE', name: 'Pernambuco' }, { code: 'PI', name: 'Piauí' },
    { code: 'RJ', name: 'Rio de Janeiro' }, { code: 'RN', name: 'Rio Grande do Norte' },
    { code: 'RS', name: 'Rio Grande do Sul' }, { code: 'RO', name: 'Rondônia' }, { code: 'RR', name: 'Roraima' },
    { code: 'SC', name: 'Santa Catarina' }, { code: 'SP', name: 'São Paulo' }, { code: 'SE', name: 'Sergipe' },
    { code: 'TO', name: 'Tocantins' },
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', padding: '3rem 0' }}>
      <div className="container">

        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
          <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Sistema MRV por Satélite</span>
          <h1 className="font-clash" style={{ fontSize: '2.2rem', textTransform: 'uppercase', marginTop: '0.4rem' }}>Análise de Carbono</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '3rem', alignItems: 'start' }}>

          {/* LEFT — FORM */}
          <div>
            <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>

              {/* ====== CAR/SICAR — DESTAQUE PRINCIPAL ====== */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid var(--green)', backgroundColor: 'var(--surface2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🛰️</span>
                  <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                    Número do CAR / SICAR
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                  Cole o registro do Cadastro Ambiental Rural para carregar os limites oficiais da propriedade automaticamente.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="Ex: MT-5107925-ABCD1234"
                    value={carNumber}
                    onChange={(e) => { setCarNumber(e.target.value); setCarError(''); setCarFound(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleFetchCar())}
                    style={{ flex: 1, fontSize: '0.9rem', letterSpacing: '0.05em' }}
                  />
                  <button
                    type="button"
                    onClick={handleFetchCar}
                    disabled={carLoading || !carNumber.trim()}
                    style={{
                      padding: '0 1.25rem',
                      border: '1px solid var(--green)',
                      backgroundColor: carLoading ? 'transparent' : 'var(--green)',
                      color: carLoading ? 'var(--muted)' : 'var(--bg)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      cursor: carLoading ? 'wait' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {carLoading ? '...' : 'Buscar'}
                  </button>
                </div>
                {carError && <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'block', marginTop: '0.5rem' }}>{carError}</span>}
                {carFound && <span style={{ fontSize: '0.75rem', color: 'var(--green)', display: 'block', marginTop: '0.5rem' }}>✓ Propriedade localizada — ajuste os limites no mapa se necessário</span>}
              </div>

              {/* ====== MAPA — SEMPRE VISÍVEL E GRANDE ====== */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Delimite a Propriedade no Mapa</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {area > 0 && (
                      <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 700 }}>
                        {area.toLocaleString()} ha
                      </span>
                    )}
                    <div
                      className="font-mono"
                      style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.6rem',
                        color: polygonGeoJSON ? 'var(--green)' : 'var(--muted)',
                        border: `1px solid ${polygonGeoJSON ? 'var(--green)' : 'var(--border)'}`,
                      }}
                    >
                      {polygonGeoJSON ? '✓ POLÍGONO OK' : 'SEM POLÍGONO'}
                    </div>
                  </div>
                </div>
                <FarmMap
                  onPolygonChange={handlePolygonChange}
                  externalPolygon={externalPolygon}
                  mapHeight="520px"
                />
              </div>

              {/* ====== CAMPOS SECUNDÁRIOS ====== */}
              <details style={{ marginBottom: '1.5rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', userSelect: 'none', marginBottom: '1rem' }}>
                  ▸ Detalhes adicionais (opcional)
                </summary>
                <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Nome do Imóvel</label>
                    <input type="text" className="form-input" placeholder="Ex: Fazenda Bela Vista" value={propName} onChange={(e) => setPropName(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={state} onChange={(e) => setState(e.target.value)}>
                      {BR_STATES.map((st) => <option key={st.code} value={st.code}>{st.name} ({st.code})</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Cobertura Vegetal</label>
                    <select className="form-select" value={vegetation} onChange={(e) => setVegetation(e.target.value)}>
                      <option value=">80% nativa densa">&gt;80% nativa densa</option>
                      <option value="60-80% pastagem+reserva">60-80% pastagem + reserva</option>
                      <option value="40-60% uso misto">40-60% uso misto</option>
                      <option value="20-40% agricultura">20-40% agricultura</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Modelo de Gestão</label>
                    <select className="form-select" value={landUse} onChange={(e) => setLandUse(e.target.value)}>
                      <option value="Florestal/Reserva">Conservação Florestal / Reserva Legal</option>
                      <option value="Agropecuária com reserva">Agropecuária Integrada de Baixo Carbono</option>
                      <option value="Agricultura intensiva+faixa verde">Agricultura de Rotação com Faixa Verde</option>
                    </select>
                  </div>
                </div>
              </details>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', fontSize: '0.95rem' }}
                disabled={loading || (!polygonGeoJSON && area <= 0)}
              >
                {loading ? (
                  <>
                    <div style={{ width: '18px', height: '18px', border: '2px solid rgba(0,0,0,0.1)', borderTop: '2px solid var(--bg)', animation: 'spin 1s linear infinite' }} />
                    Analisando via Satélite...
                  </>
                ) : '🛰️ Analisar Carbono'}
              </button>

              {!polygonGeoJSON && (
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', marginTop: '0.75rem' }}>
                  Busque pelo CAR ou desenhe o polígono no mapa para analisar
                </p>
              )}
            </form>
          </div>

          {/* RIGHT — RESULTS */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Relatório Espectral IA</h3>

            {loading && (
              <div style={{ height: '420px', backgroundColor: 'var(--surface)', border: '1px dashed var(--border2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div style={{ width: '45px', height: '45px', border: '3px solid var(--border)', borderTop: '3px solid var(--green)', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }} />
                <span className="font-mono" style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.85rem', color: 'var(--green)', textAlign: 'center' }}>
                  [ CALCULANDO SEQUESTRO VIA SENTINEL-2 ]
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Consolidando índices espectrais...</span>
              </div>
            )}

            {!loading && !result && (
              <div style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border)', padding: '3rem 2rem', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🛰️</span>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Aguardando Análise</h4>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto' }}>
                  Busque pelo CAR ou desenhe a área da propriedade no mapa e clique em Analisar.
                </p>
              </div>
            )}

            {!loading && result && (() => {
              const isGeo = !!result.metrics;
              const tons        = isGeo ? result.metrics.carbon_tco2e : result.tons_co2;
              const ndvi        = isGeo ? result.metrics.ndvi_avg     : result.ndvi_score;
              const ndviIsReal  = isGeo ? result.metrics.ndvi_is_real : false;
              const ndviSrc     = isGeo ? result.metrics.ndvi_source  : 'Sentinel-2 (Simulação)';
              const method      = isGeo ? result.metrics.methodology  : 'IPCC Tier 1 + Embrapa';
              const mrvPct      = isGeo ? 85 : result.mrv_eligibility_pct;
              const socData     = isGeo ? result.metrics.soc_data     : null;
              const marketLow   = isGeo ? result.metrics.market_value.low_usd  : null;
              const marketMid   = isGeo ? result.metrics.market_value.mid_usd  : null;
              const marketHigh  = isGeo ? result.metrics.market_value.high_usd : null;
              const valueBRL    = isGeo ? marketMid * 5.25 : result.estimated_value_brl;
              const displayName = propName || (carNumber ? `CAR ${carNumber.toUpperCase()}` : 'Propriedade Analisada');

              return (
                <div style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border2)', padding: '2.5rem', animation: 'resultFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>

                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                    <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>
                      ANÁLISE SATELLITÁRIA GEOPROCESSADA
                    </span>
                    <h4 className="font-clash" style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>{displayName}</h4>
                    <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Cód: IM-BR-{state}-{Math.floor(100000 + Math.random() * 900000)}</span>
                  </div>

                  {/* Carbono */}
                  <div style={{ marginBottom: '2rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Carbono Sequestrado Estimado</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                      <span className="font-clash" style={{ fontSize: '2.75rem', fontWeight: 600 }}>{tons.toLocaleString()}</span>
                      <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--green)' }}>tCO₂e / ano</span>
                    </div>
                  </div>

                  {/* Faixa de preço */}
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.25rem', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.75rem' }}>Valor de Mercado (Faixa Calibrada)</span>
                    {isGeo && marketLow !== null
                      ? <PriceRange low={marketLow} mid={marketMid} high={marketHigh} currency="US$" />
                      : <span className="font-mono" style={{ fontSize: '1.5rem', color: 'var(--gold)', fontWeight: 600 }}>R$ {valueBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    }
                  </div>

                  {/* NDVI com badge */}
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.25rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Índice NDVI Médio</span>
                        <span className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--green)' }}>{ndvi}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                        <DataSourceBadge isReal={ndviIsReal} label={ndviIsReal ? 'Sentinel-2' : null} />
                        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>VERIFICAÇÃO ALTA</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.5rem' }}>{ndviSrc}</div>
                  </div>

                  {/* SoilGrids */}
                  {socData && (
                    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>COS - Carbono Orgânico do Solo (0-30cm)</span>
                          <span className="font-mono" style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
                            {socData.soc_g_per_kg !== null ? `${socData.soc_g_per_kg} g/kg` : 'N/D'}
                          </span>
                          {socData.bonus_tco2e > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--green)', display: 'block' }}>+{socData.bonus_tco2e} tCO₂e bônus edáfico</span>}
                        </div>
                        <DataSourceBadge isReal={socData.is_real} label={socData.is_real ? 'SoilGrids' : null} />
                      </div>
                    </div>
                  )}

                  {/* Barras */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
                    {[
                      { label: 'Potencial Estável de Sequestro', value: `${(tons / (Math.max(area, 1) * 15) * 100).toFixed(0)}%`, pct: Math.min(100, Math.max(15, (tons / (Math.max(area, 1) * 15) * 100))), color: 'var(--green)' },
                      { label: `Elegibilidade MRV (${method.split('+')[0].trim()})`, value: `${mrvPct}%`, pct: mrvPct, color: 'var(--green)' },
                    ].map((bar) => (
                      <div key={bar.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                          <span style={{ color: 'var(--muted)' }}>{bar.label}</span>
                          <span className="font-mono" style={{ color: bar.color }}>{bar.value}</span>
                        </div>
                        <div style={{ height: '4px', backgroundColor: 'var(--bg)', width: '100%' }}>
                          <div style={{ height: '100%', backgroundColor: bar.color, width: `${bar.pct}%`, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {isAuthenticated ? (
                    <button onClick={handleGenerateReport} className="btn btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '0.85rem' }} disabled={downloading}>
                      {downloading ? 'Gerando Laudo PDF...' : 'Gerar Laudo MRV Completo'}
                    </button>
                  ) : (
                    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '1rem' }}>
                        Crie sua conta grátis para baixar o laudo completo em PDF.
                      </span>
                      <Link to="/cadastro" className="btn btn-secondary" style={{ width: '100%', padding: '0.7rem', fontSize: '0.8rem', textAlign: 'center', display: 'block' }}>
                        Criar minha conta grátis
                      </Link>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes resultFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Evaluation;
