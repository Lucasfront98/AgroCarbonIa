import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { evaluationService } from '../services/api';

const Evaluation = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Form Fields
  const [propName, setPropName] = useState('Fazenda Progresso');
  const [state, setState] = useState('MT');
  const [area, setArea] = useState(500);
  const [vegetation, setVegetation] = useState('60-80% pastagem+reserva');
  const [landUse, setLandUse] = useState('Agropecuária com reserva');

  // Interactive UI State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Pre-fill from Landing Page simulator redirection
  useEffect(() => {
    if (location.state) {
      if (location.state.state) setState(location.state.state);
      if (location.state.area) setArea(location.state.area);
      if (location.state.vegetation) setVegetation(location.state.vegetation);
      if (location.state.landUse) setLandUse(location.state.landUse);
      
      // Auto trigger evaluation if pre-filled
      setLoading(true);
      evaluationService.evaluate({
        state: location.state.state,
        area_ha: location.state.area,
        vegetation_cover: location.state.vegetation,
        land_use: location.state.landUse
      }).then((res) => {
        setResult(res.data);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await evaluationService.evaluate({
        state,
        area_ha: area,
        vegetation_cover: vegetation,
        land_use: landUse
      });
      setResult(res.data);
    } catch (err) {
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
        propertyName: propName,
        state,
        area,
        vegetation,
        landUse,
        tons_co2: result.tons_co2,
        estimated_value_brl: result.estimated_value_brl,
        ndvi_score: result.ndvi_score,
        mrv_eligibility_pct: result.mrv_eligibility_pct
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laudo_MRV_${propName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Ocorreu um erro ao gerar o laudo.');
    } finally {
      setDownloading(false);
    }
  };

  const BR_STATES = [
    { code: 'AC', name: 'Acre' },
    { code: 'AL', name: 'Alagoas' },
    { code: 'AP', name: 'Amapá' },
    { code: 'AM', name: 'Amazonas' },
    { code: 'BA', name: 'Bahia' },
    { code: 'CE', name: 'Ceará' },
    { code: 'DF', name: 'Distrito Federal' },
    { code: 'ES', name: 'Espírito Santo' },
    { code: 'GO', name: 'Goiás' },
    { code: 'MA', name: 'Maranhão' },
    { code: 'MT', name: 'Mato Grosso' },
    { code: 'MS', name: 'Mato Grosso do Sul' },
    { code: 'MG', name: 'Minas Gerais' },
    { code: 'PA', name: 'Pará' },
    { code: 'PB', name: 'Paraíba' },
    { code: 'PR', name: 'Paraná' },
    { code: 'PE', name: 'Pernambuco' },
    { code: 'PI', name: 'Piauí' },
    { code: 'RJ', name: 'Rio de Janeiro' },
    { code: 'RN', name: 'Rio Grande do Norte' },
    { code: 'RS', name: 'Rio Grande do Sul' },
    { code: 'RO', name: 'Rondônia' },
    { code: 'RR', name: 'Roraima' },
    { code: 'SC', name: 'Santa Catarina' },
    { code: 'SP', name: 'São Paulo' },
    { code: 'SE', name: 'Sergipe' },
    { code: 'TO', name: 'Tocantins' },
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', padding: '4rem 0' }}>
      <div className="container">
        
        {/* Page Header */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '2rem', marginBottom: '3.5rem' }}>
          <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Sistema MRV por Satélite</span>
          <h1 className="font-clash" style={{ fontSize: '2.5rem', textTransform: 'uppercase', marginTop: '0.5rem' }}>Simulação e Laudo Ecológico</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN - FORM */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Dados da Propriedade</h3>
            
            <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2.5rem' }}>
              <div className="form-group">
                <label className="form-label">Nome do Imóvel / Fazenda</label>
                <input
                  type="text"
                  className="form-input"
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Estado Federativo (Localização)</label>
                <select
                  className="form-select"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                >
                  {BR_STATES.map((st) => (
                    <option key={st.code} value={st.code}>
                      {st.name} ({st.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Área Total do Imóvel (Hectares)</label>
                <input
                  type="number"
                  min="1"
                  className="form-input font-mono"
                  value={area}
                  onChange={(e) => setArea(Math.max(1, parseInt(e.target.value) || 0))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Densidade de Cobertura Vegetal</label>
                <select
                  className="form-select"
                  value={vegetation}
                  onChange={(e) => setVegetation(e.target.value)}
                  required
                >
                  <option value=">80% nativa densa">&gt;80% nativa densa (Reserva preservada)</option>
                  <option value="60-80% pastagem+reserva">60-80% pastagem + reserva regulamentar</option>
                  <option value="40-60% uso misto">40-60% uso misto com capoeira</option>
                  <option value="20-40% agricultura">20-40% agricultura / pasto limpo</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                <label className="form-label">Modelo Proposto de Gestão de Uso</label>
                <select
                  className="form-select"
                  value={landUse}
                  onChange={(e) => setLandUse(e.target.value)}
                  required
                >
                  <option value="Florestal/Reserva">Conservação Florestal / Reserva Legal</option>
                  <option value="Agropecuária com reserva">Agropecuária Integrada de Baixo Carbono</option>
                  <option value="Agricultura intensiva+faixa verde">Agricultura de Rotação com Faixa Verde</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div style={{ width: '18px', height: '18px', border: '2px solid rgba(0,0,0,0.1)', borderTop: '2px solid var(--bg)', animation: 'spin 1s linear infinite' }} />
                    Analisando espectro...
                  </>
                ) : (
                  'Analisar via Satélite'
                )}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN - RESULTS */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Relatório Espectral IA</h3>

            {loading && (
              <div
                style={{
                  height: '420px',
                  backgroundColor: 'var(--surface)',
                  border: '1px dashed var(--border2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                }}
              >
                <div style={{ width: '45px', height: '45px', border: '3px solid var(--border)', borderTop: '3px solid var(--green)', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }} />
                <span className="font-mono" style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.85rem', color: 'var(--green)', textAlign: 'center' }}>
                  [ CALCULANDO SEQUESTRO SATELLITÁRIO SENTINEL-2 ]
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Consolidando índices espectrais espectrofotométricos...</span>
              </div>
            )}

            {!loading && !result && (
              <div
                style={{
                  height: '420px',
                  backgroundColor: 'var(--surface)',
                  border: '1px dashed var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🛰️</span>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Aguardando submissão</h4>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', maxWidth: '300px' }}>Preencha o formulário e clique em Analisar para obter os dados em tempo real da constelação de satélites.</p>
              </div>
            )}

            {!loading && result && (
              <div
                style={{
                  backgroundColor: 'var(--surface2)',
                  border: '1px solid var(--border2)',
                  padding: '2.5rem',
                  animation: 'resultFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Result Title */}
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                  <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>
                    ANÁLISE SPECTRORADIOÉTRICA CONCLUÍDA
                  </span>
                  <h4 className="font-clash" style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>{propName}</h4>
                  <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Cód: IM-BR-{state}-{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>

                {/* Score panel */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Carbono Estimado</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                      <span className="font-clash" style={{ fontSize: '2.75rem', fontWeight: 600 }}>{result.tons_co2.toLocaleString()}</span>
                      <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--green)' }}>tCO₂</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Valor Financeiro Est.</span>
                    <span className="font-mono" style={{ fontSize: '1.6rem', color: 'var(--gold)', fontWeight: 600, display: 'block', marginTop: '0.5rem' }}>
                      R$ {result.estimated_value_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Metrics detail */}
                <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.25rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Índice NDVI Médio</span>
                    <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--green)' }}>
                      {result.ndvi_score}
                    </span>
                  </div>
                  <div>
                    <span className="badge badge-green">VERIFICAÇÃO ALTA</span>
                  </div>
                </div>

                {/* Progress bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
                  
                  {/* Potencial sequestro */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: 'var(--muted)' }}>Potencial Estável de Sequestro</span>
                      <span className="font-mono" style={{ color: 'var(--green)' }}>{(result.tons_co2 / (area * 1.5 * 1.2 * 1.5) * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '4px', backgroundColor: 'var(--bg)', width: '100%' }}>
                      <div style={{ height: '100%', backgroundColor: 'var(--green)', width: `${Math.min(100, Math.max(15, (result.tons_co2 / (area * 1.5 * 1.2 * 1.5) * 100)))}%` }} />
                    </div>
                  </div>

                  {/* Elegibilidade MRV */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: 'var(--muted)' }}>Elegibilidade MRV</span>
                      <span className="font-mono" style={{ color: 'var(--green)' }}>{result.mrv_eligibility_pct}%</span>
                    </div>
                    <div style={{ height: '4px', backgroundColor: 'var(--bg)', width: '100%' }}>
                      <div style={{ height: '100%', backgroundColor: 'var(--green)', width: `${result.mrv_eligibility_pct}%` }} />
                    </div>
                  </div>

                  {/* Valor de mercado */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: 'var(--muted)' }}>Qualificação do Preço de Mercado</span>
                      <span className="font-mono" style={{ color: 'var(--gold)' }}>R$ 48.00 / t</span>
                    </div>
                    <div style={{ height: '4px', backgroundColor: 'var(--bg)', width: '100%' }}>
                      <div style={{ height: '100%', backgroundColor: 'var(--gold)', width: `${Math.min(100, (result.estimated_value_brl / 200000) * 100)}%` }} />
                    </div>
                  </div>

                </div>

                {/* Authentication gate button */}
                {isAuthenticated ? (
                  <button
                    onClick={handleGenerateReport}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.9rem', fontSize: '0.85rem' }}
                    disabled={downloading}
                  >
                    {downloading ? 'Gerando Laudo PDF...' : 'Gerar Laudo MRV Completo'}
                  </button>
                ) : (
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '1rem' }}>
                      Crie sua conta grátis para baixar o laudo completo do satélite em PDF.
                    </span>
                    <Link to="/cadastro" className="btn btn-secondary" style={{ width: '100%', padding: '0.7rem', fontSize: '0.8rem', textAlign: 'center', display: 'block' }}>
                      Criar minha conta grátis
                    </Link>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>

      <style>{`
        @keyframes resultFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Evaluation;
