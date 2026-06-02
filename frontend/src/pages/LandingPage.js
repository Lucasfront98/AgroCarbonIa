import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { marketplaceService } from '../services/api';

const LandingPage = () => {
  const navigate = useNavigate();
  
  // Tab switcher in "Como funciona"
  const [activeTab, setActiveTab] = useState('vender'); // 'vender' or 'comprar'
  
  // Count-up animations state
  const [creditsTraded, setCreditsTraded] = useState(0);
  const [volumeTraded, setVolumeTraded] = useState(0);
  const [propertiesEvaluated, setPropertiesEvaluated] = useState(0);
  const [avgTime, setAvgTime] = useState(0);

  // Marketplace preview listings
  const [listings, setListings] = useState([]);
  // filterType state removed (unused)

  // Simulator Form State
  const [simState, setSimState] = useState('MT');
  const [simArea, setSimArea] = useState(500);
  const [simVeg, setSimVeg] = useState('60-80% pastagem+reserva');
  const [simUse, setSimUse] = useState('Agropecuária com reserva');
  
  // Simulator results
  const [simResult, setSimResult] = useState({ tons: 0, value: 0, mrv: 0 });

  const handleNavClick = (anchorId) => {
    const element = document.getElementById(anchorId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Run Count-up animations on mount
  useEffect(() => {
    // Count up 1248
    const credInterval = setInterval(() => {
      setCreditsTraded(prev => {
        if (prev >= 1248) {
          clearInterval(credInterval);
          return 1248;
        }
        return prev + 24;
      });
    }, 30);

    // Count up 487200
    const volInterval = setInterval(() => {
      setVolumeTraded(prev => {
        if (prev >= 487200) {
          clearInterval(volInterval);
          return 487200;
        }
        return prev + 9744;
      });
    }, 30);

    // Count up 342
    const propInterval = setInterval(() => {
      setPropertiesEvaluated(prev => {
        if (prev >= 342) {
          clearInterval(propInterval);
          return 342;
        }
        return prev + 6;
      });
    }, 30);

    // Count up 2.1
    const timeInterval = setInterval(() => {
      setAvgTime(prev => {
        if (prev >= 2.1) {
          clearInterval(timeInterval);
          return 2.1;
        }
        return parseFloat((prev + 0.1).toFixed(1));
      });
    }, 80);

    return () => {
      clearInterval(credInterval);
      clearInterval(volInterval);
      clearInterval(propInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // Fetch Marketplace preview listings (3 cards)
  useEffect(() => {
    marketplaceService.getListings().then((res) => {
      setListings(res.data.slice(0, 3));
    });
  }, []);

  // Recalculate simulation results on input change
  useEffect(() => {
    let vegFactor = 0.5;
    if (simVeg === '>80% nativa densa') vegFactor = 1.0;
    else if (simVeg === '60-80% pastagem+reserva') vegFactor = 0.8;
    else if (simVeg === '40-60% uso misto') vegFactor = 0.6;
    else if (simVeg === '20-40% agricultura') vegFactor = 0.4;

    let useFactor = 0.6;
    if (simUse === 'Florestal/Reserva') useFactor = 1.2;
    else if (simUse === 'Agropecuária com reserva') useFactor = 0.8;
    else if (simUse === 'Agricultura intensiva+faixa verde') useFactor = 0.5;

    const tons = Math.round(simArea * vegFactor * useFactor * 1.5);
    const value = tons * 48.00; // Average price: R$ 48/tCO2
    
    // MRV eligibility
    let mrv = 50;
    if (simVeg === '>80% nativa densa' && simUse === 'Florestal/Reserva') mrv = 95;
    else if (simVeg === '60-80% pastagem+reserva') mrv = 80;
    else if (simVeg === '40-60% uso misto') mrv = 65;
    else mrv = 45;

    setSimResult({ tons, value, mrv });
  }, [simState, simArea, simVeg, simUse]);

  const previewFiltered = listings;

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', width: '100%' }}>
      {/* 1. Animated price ticker */}
      <div className="ticker-wrap">
        <div className="ticker">
          {[1, 2].map((loop) => (
            <React.Fragment key={loop}>
              <div className="ticker-item font-mono">
                <span>CARB-MT-2025</span>
                <span style={{ color: 'var(--gold)', marginLeft: '0.5rem' }}>R$ 48,20</span>
                <span style={{ color: 'var(--green)', marginLeft: '0.4rem' }}>+1.4% ↑</span>
              </div>
              <div className="ticker-item font-mono">
                <span>CARB-GO-2025</span>
                <span style={{ color: 'var(--gold)', marginLeft: '0.5rem' }}>R$ 52,50</span>
                <span style={{ color: 'var(--green)', marginLeft: '0.4rem' }}>+2.1% ↑</span>
              </div>
              <div className="ticker-item font-mono">
                <span>CARB-PR-2025</span>
                <span style={{ color: 'var(--gold)', marginLeft: '0.5rem' }}>R$ 44,90</span>
                <span style={{ color: '#ef4444', marginLeft: '0.4rem' }}>-0.5% ↓</span>
              </div>
              <div className="ticker-item font-mono">
                <span>CARB-MS-2025</span>
                <span style={{ color: 'var(--gold)', marginLeft: '0.5rem' }}>R$ 55,00</span>
                <span style={{ color: 'var(--green)', marginLeft: '0.4rem' }}>+3.8% ↑</span>
              </div>
              <div className="ticker-item font-mono">
                <span>CARB-BA-2025</span>
                <span style={{ color: 'var(--gold)', marginLeft: '0.5rem' }}>R$ 49,90</span>
                <span style={{ color: 'var(--green)', marginLeft: '0.4rem' }}>+0.9% ↑</span>
              </div>
              <div className="ticker-item font-mono">
                <span>CARB-SP-2025</span>
                <span style={{ color: 'var(--gold)', marginLeft: '0.5rem' }}>R$ 42,50</span>
                <span style={{ color: '#ef4444', marginLeft: '0.4rem' }}>-1.2% ↓</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 2. Hero Section */}
      <section style={{ padding: '6rem 0 4rem 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              lineHeight: 1.1,
              maxWidth: '900px',
              margin: '0 auto 2.5rem auto',
              textTransform: 'uppercase',
            }}
          >
            Avalie. Certifique.<br />
            <span style={{ color: 'var(--green)' }}>Negocie carbono.</span>
          </h1>
          <p
            style={{
              color: 'var(--muted)',
              fontSize: '1.2rem',
              maxWidth: '650px',
              margin: '0 auto 3rem auto',
              fontWeight: 300,
            }}
          >
            A plataforma inteligente que analisa sua propriedade rural via satélite em segundos e conecta você aos maiores compradores corporativos globais.
          </p>

          {/* Hero CTAs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              maxWidth: '750px',
              margin: '0 auto 4rem auto',
            }}
          >
            {/* CTA 1: Produtor */}
            <div
              onClick={() => navigate('/avaliar')}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border2)',
                padding: '2rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--green)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border2)';
              }}
            >
              <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>PRODUTOR RURAL</span>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Avalie minha propriedade</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Utilize nossa IA satelitária para descobrir o potencial de crédito em segundos de forma grátis.</p>
              <span style={{ color: 'var(--green)', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                SIMULAR AGORA &rarr;
              </span>
            </div>

            {/* CTA 2: Comprador */}
            <div
              onClick={() => navigate('/marketplace')}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                padding: '2rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <span className="font-mono" style={{ color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>COMPRADOR</span>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Comprar créditos verificados</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Adquira lotes MRV auditáveis, certificados e devidamente rastreáveis com total segurança em blockchain.</p>
              <span style={{ color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                EXPLORAR MARKETPLACE &rarr;
              </span>
            </div>
          </div>

          {/* 3. Four live stat counters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2rem',
              borderTop: '1px solid var(--border)',
              paddingTop: '3rem',
            }}
          >
            <div>
              <span className="font-mono stat-number" style={{ fontSize: '2.5rem', color: 'var(--green)', fontWeight: 500 }}>
                {creditsTraded.toLocaleString()}
              </span>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem' }}>
                créditos negociados hoje
              </span>
            </div>
            <div>
              <span className="font-mono stat-number" style={{ fontSize: '2.5rem', color: 'var(--gold)', fontWeight: 500 }}>
                R$ {volumeTraded.toLocaleString('pt-BR')}
              </span>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem' }}>
                volume financeiro hoje
              </span>
            </div>
            <div>
              <span className="font-mono stat-number" style={{ fontSize: '2.5rem', color: 'var(--text)', fontWeight: 500 }}>
                {propertiesEvaluated.toLocaleString()}
              </span>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem' }}>
                propriedades avaliadas
              </span>
            </div>
            <div>
              <span className="font-mono stat-number" style={{ fontSize: '2.5rem', color: 'var(--green)', fontWeight: 500 }}>
                {avgTime.toFixed(1)}s
              </span>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem' }}>
                tempo médio análise
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "Como funciona" section */}
      <section id="como-funciona" style={{ padding: '6rem 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Operação ponta a ponta</span>
            <h2 style={{ fontSize: '2.5rem', textTransform: 'uppercase', marginTop: '0.5rem' }}>Como funciona a plataforma</h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '4rem',
              alignItems: 'center',
            }}
          >
            {/* Left side: Steps + tab switcher */}
            <div>
              {/* Tab Switcher */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '2.5rem' }}>
                <button
                  onClick={() => setActiveTab('vender')}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    border: 'none',
                    borderBottom: activeTab === 'vender' ? '2px solid var(--green)' : 'none',
                    color: activeTab === 'vender' ? 'var(--green)' : 'var(--muted)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                  }}
                >
                  Vender Créditos
                </button>
                <button
                  onClick={() => setActiveTab('comprar')}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    border: 'none',
                    borderBottom: activeTab === 'comprar' ? '2px solid var(--green)' : 'none',
                    color: activeTab === 'comprar' ? 'var(--green)' : 'var(--muted)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                  }}
                >
                  Comprar Créditos
                </button>
              </div>

              {/* Sell Flow */}
              {activeTab === 'vender' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div className="font-mono flex-center" style={{ width: '40px', height: '40px', border: '1px solid var(--border2)', color: 'var(--green)', flexShrink: 0, fontSize: '1.1rem' }}>
                      01
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Delimite sua propriedade</h4>
                      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Insira a área da sua fazenda ou desenhe o perímetro da reserva legal de forma simplificada no mapa.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div className="font-mono flex-center" style={{ width: '40px', height: '40px', border: '1px solid var(--border2)', color: 'var(--green)', flexShrink: 0, fontSize: '1.1rem' }}>
                      02
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>IA analisa via satélite</h4>
                      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Nossos algoritmos processam imagens espectrais históricas analisando índices NDVI e biomassa viva em 2 segundos.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div className="font-mono flex-center" style={{ width: '40px', height: '40px', border: '1px solid var(--border2)', color: 'var(--green)', flexShrink: 0, fontSize: '1.1rem' }}>
                      03
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Receba laudo MRV completo</h4>
                      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Um relatório em PDF criptografado e auditável contendo volumetria de CO₂ e dados elegíveis para certificação imediata.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div className="font-mono flex-center" style={{ width: '40px', height: '40px', border: '1px solid var(--border2)', color: 'var(--green)', flexShrink: 0, fontSize: '1.1rem' }}>
                      04
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Publique no marketplace</h4>
                      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Seus créditos são tokenizados e colocados no catálogo com acesso direto a centenas de corporações e investidores.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Buy Flow */}
              {activeTab === 'comprar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div className="font-mono flex-center" style={{ width: '40px', height: '40px', border: '1px solid var(--border2)', color: 'var(--gold)', flexShrink: 0, fontSize: '1.1rem' }}>
                      01
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Crie sua conta corporativa</h4>
                      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Realize o cadastro rápido da sua empresa e defina suas metas anuais ESG de compensação em toneladas de CO₂.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div className="font-mono flex-center" style={{ width: '40px', height: '40px', border: '1px solid var(--border2)', color: 'var(--gold)', flexShrink: 0, fontSize: '1.1rem' }}>
                      02
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Explore créditos verificados</h4>
                      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Filtre listagens por tipo de vegetação, estado e nota NDVI. Tenha acesso a fotos espectrais e laudos MRV reais.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div className="font-mono flex-center" style={{ width: '40px', height: '40px', border: '1px solid var(--border2)', color: 'var(--gold)', flexShrink: 0, fontSize: '1.1rem' }}>
                      03
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Compre e receba certificado</h4>
                      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Conclua o pagamento via plataforma e receba imediatamente o título de neutralização inviolável e o certificado PDF.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div className="font-mono flex-center" style={{ width: '40px', height: '40px', border: '1px solid var(--border2)', color: 'var(--gold)', flexShrink: 0, fontSize: '1.1rem' }}>
                      04
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Rastreie seu impacto</h4>
                      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Monitore os projetos apoiados em tempo real através do painel ESG com auditorias e relatórios automatizados.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Mockup MRV Report */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border2)',
                padding: '2.5rem',
                position: 'relative',
              }}
            >
              {/* Technical Grid Accent */}
              <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '0.65rem', padding: '0.5rem', color: 'var(--muted2)', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} className="font-mono">
                SECURE_HASH: SHA-256_FNH2026
              </div>

              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <span className="badge badge-green" style={{ marginBottom: '1rem' }}>SATELLITE MRV VERIFIED</span>
                <h3 className="font-clash" style={{ fontSize: '1.6rem', letterSpacing: '0.02em' }}>Fazenda Novo Horizonte</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Sorriso, Mato Grosso &nbsp;📍</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Área do Imóvel</span>
                  <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 500 }}>1.240 ha</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Índice NDVI Médio</span>
                  <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--green)' }}>0.72 <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>(Excelente)</span></span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Potencial de Sequestro</span>
                  <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 500 }}>1.860 tCO₂</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Valor de Mercado Est.</span>
                  <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--gold)' }}>R$ 89.688,00</span>
                </div>
              </div>

              {/* Visual mini-map spectrum display simulator */}
              <div style={{ border: '1px solid var(--border)', height: '100px', backgroundColor: '#09100d', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', opacity: 0.15 }}>
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} style={{ border: '1px solid rgba(255,255,255,0.05)', backgroundColor: i % 3 === 0 ? 'var(--green)' : 'transparent' }} />
                  ))}
                </div>
                <div className="font-mono" style={{ color: 'var(--green)', fontSize: '0.75rem', letterSpacing: '0.1em', zIndex: 1, backgroundColor: 'var(--surface)', padding: '0.25rem 0.5rem', border: '1px solid var(--border2)' }}>
                  [ SPECTRUM ANALYSIS SCANNING DONE ]
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--muted)' }} className="font-mono">
                <span>Protocolo Blockchain: v2.54</span>
                <span>AUDIT STATUS: 100% SUCCESS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Marketplace preview */}
      <section style={{ padding: '6rem 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="font-mono" style={{ color: 'var(--gold)', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Oportunidades em aberto</span>
              <h2 style={{ fontSize: '2.5rem', textTransform: 'uppercase', marginTop: '0.5rem' }}>Lotes em destaque</h2>
            </div>
            <Link to="/marketplace" className="btn btn-secondary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.8rem' }}>
              Ver todos os créditos &rarr;
            </Link>
          </div>

          {/* Cards list */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
            }}
          >
            {previewFiltered.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <span className="font-mono code" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {item.id}
                    </span>
                    <span className="badge badge-green" style={{ borderColor: 'rgba(61,220,132,0.15)', color: 'var(--green)', fontSize: '0.7rem' }}>
                      {item.type}
                    </span>
                  </div>

                  <h3 className="font-clash" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{item.farmName}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '1.5rem' }}>
                    📍 {item.city}, {item.state}
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1rem 0', marginBottom: '1.5rem' }} className="font-mono">
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Área total</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.area.toLocaleString()} ha</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Média NDVI</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--green)' }}>{item.ndvi}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Carbono</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.tco2.toLocaleString()} tCO₂</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Preço/t</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--green)' }}>R$ {item.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Link to="/marketplace" className="btn btn-primary" style={{ width: '100%', padding: '0.7rem', textAlign: 'center', fontSize: '0.8rem' }}>
                  Comprar créditos
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Evaluation simulator */}
      <section style={{ padding: '6rem 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4rem' }}>
            
            {/* Left: Input Form */}
            <div>
              <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Simulação instantânea</span>
              <h2 style={{ fontSize: '2.5rem', textTransform: 'uppercase', marginTop: '0.5rem', marginBottom: '2rem' }}>Descubra seu potencial</h2>
              
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Estado da Propriedade</label>
                  <select
                    className="form-select"
                    value={simState}
                    onChange={(e) => setSimState(e.target.value)}
                  >
                    <option value="MT">Mato Grosso (MT)</option>
                    <option value="GO">Goiás (GO)</option>
                    <option value="PR">Paraná (PR)</option>
                    <option value="MS">Mato Grosso do Sul (MS)</option>
                    <option value="BA">Bahia (BA)</option>
                    <option value="SP">São Paulo (SP)</option>
                    <option value="PA">Pará (PA)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Área Reservada ou Pastagem (ha)</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={simArea}
                    onChange={(e) => setSimArea(Math.max(1, parseInt(e.target.value) || 0))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cobertura Vegetal Predominante</label>
                  <select
                    className="form-select"
                    value={simVeg}
                    onChange={(e) => setSimVeg(e.target.value)}
                  >
                    <option value=">80% nativa densa">&gt;80% nativa densa (Mata fechada)</option>
                    <option value="60-80% pastagem+reserva">60-80% pastagem + reserva</option>
                    <option value="40-60% uso misto">40-60% uso misto</option>
                    <option value="20-40% agricultura">20-40% agricultura / pasto degradado</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo de Uso de Solo Proposto</label>
                  <select
                    className="form-select"
                    value={simUse}
                    onChange={(e) => setSimUse(e.target.value)}
                  >
                    <option value="Florestal/Reserva">Conservação Florestal / Reserva Integrada</option>
                    <option value="Agropecuária com reserva">Agropecuária de Baixo Carbono</option>
                    <option value="Agricultura intensiva+faixa verde">Agricultura Intensiva + Faixa Verde</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right: Simulated visual chart results */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ border: '1px solid var(--border2)', backgroundColor: 'var(--surface2)', padding: '2.5rem' }}>
                <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--green)', display: 'block', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.1em' }}>
                  ESTIMATIVA PRELIMINAR VIA SATÉLITE
                </span>

                <div style={{ marginBottom: '2rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Créditos de Carbono Estimados</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span className="font-clash" style={{ fontSize: '3rem', fontWeight: 600 }}>{simResult.tons.toLocaleString()}</span>
                    <span className="font-mono" style={{ fontSize: '1rem', color: 'var(--green)' }}>tCO₂ / ano</span>
                  </div>
                </div>

                {/* Simulated progress charts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                  
                  {/* Potencial de Sequestro */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                      <span>Potencial de Sequestro</span>
                      <span className="font-mono" style={{ color: 'var(--green)' }}>Alto ({(simResult.tons / (simArea * 1.5 * 1.2 * 1.5) * 100).toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', width: '100%' }}>
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: 'var(--green)',
                          width: `${Math.min(100, Math.max(15, (simResult.tons / (simArea * 1.5 * 1.2 * 1.5) * 100)))}%`,
                          transition: 'var(--transition)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Elegibilidade MRV */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                      <span>Elegibilidade MRV (Confiança Satélite)</span>
                      <span className="font-mono" style={{ color: 'var(--green)' }}>{simResult.mrv}%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', width: '100%' }}>
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: 'var(--green)',
                          width: `${simResult.mrv}%`,
                          transition: 'var(--transition)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Valor de Mercado */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                      <span>Valor de Mercado Estimado</span>
                      <span className="font-mono" style={{ color: 'var(--gold)' }}>R$ {simResult.value.toLocaleString('pt-BR')}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', width: '100%' }}>
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: 'var(--gold)',
                          width: `${Math.min(100, Math.max(20, (simResult.value / 300000) * 100))}%`,
                          transition: 'var(--transition)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/avaliar', { state: { state: simState, area: simArea, vegetation: simVeg, landUse: simUse } })}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '0.9rem', fontSize: '0.85rem' }}
                >
                  Fazer Avaliação Detalhada e Gerar Laudo &rarr;
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. "Por que nós" grid */}
      <section id="por-que-nos" style={{ padding: '6rem 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
            <span className="font-mono" style={{ color: 'var(--gold)', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Vantagem AgroCarbonIa</span>
            <h2 style={{ fontSize: '2.5rem', textTransform: 'uppercase', marginTop: '0.5rem' }}>Por que escolher nossa plataforma?</h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Card 1 */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>📡</span>
              <h4 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Dados de satélite em tempo real</h4>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Análise multiespectral direta via Sentinel-2 e Landsat-9, garantindo veracidade contínua e sem fraudes.</p>
            </div>

            {/* Card 2 */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>⏱️</span>
              <h4 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Análise em 2 segundos</h4>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sem esperas burocráticas ou medições manuais custosas. Obtenha métricas de elegibilidade instantaneamente.</p>
            </div>

            {/* Card 3 */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>🔗</span>
              <h4 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Créditos em blockchain</h4>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Cada tCO₂ é indexada e tokenizada eletronicamente para evitar dupla contagem e garantir liquidez ágil.</p>
            </div>

            {/* Card 4 */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>🇧🇷</span>
              <h4 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Feito para o produtor brasileiro</h4>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Totalmente integrado às normas do CAR (Cadastro Ambiental Rural) e regulação brasileira de ativos ambientais.</p>
            </div>

            {/* Card 5 */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>📋</span>
              <h4 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Laudo MRV auditável</h4>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Documentação em conformidade com as diretrizes do IPCC e padrões internacionais de mensuração e relato.</p>
            </div>

            {/* Card 6 */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>💰</span>
              <h4 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>85% mais econômico</h4>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>A automação satelitária elimina os custos elevados de consultorias em campo tradicionais.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer CTA */}
      <section style={{ padding: '6rem 0', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className="font-clash" style={{ fontSize: '2.5rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Comece agora — é grátis</h2>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
            Descubra o potencial verde da sua fazenda ou impulsione sua empresa na agenda ambiental em poucos cliques.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/cadastro" className="btn btn-primary" style={{ padding: '0.85rem 2rem' }}>
              Cadastrar como Produtor
            </Link>
            <Link to="/cadastro" className="btn btn-secondary" style={{ padding: '0.85rem 2rem' }}>
              Cadastrar como Comprador
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer style={{ padding: '4rem 0 2rem 0', backgroundColor: 'var(--bg)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '3rem', paddingBottom: '3rem', borderBottom: '1px solid var(--border)' }}>
            
            {/* Column 1 */}
            <div>
              <span className="font-clash" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--green)', display: 'block', marginBottom: '1rem' }}>
                AGROCARBONIA
              </span>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', maxWidth: '280px' }}>
                Conectando produtores brasileiros a fundos de investimentos globais através de tecnologia satelitária avançada.
              </p>
            </div>

            {/* Column 2 */}
            <div>
              <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem', color: 'var(--muted)' }}>Plataforma</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <Link to="/marketplace" style={{ color: 'var(--muted)' }} onMouseEnter={e => e.target.style.color = 'var(--green)'} onMouseLeave={e => e.target.style.color = 'var(--muted)'}>Marketplace</Link>
                <Link to="/avaliar" style={{ color: 'var(--muted)' }} onMouseEnter={e => e.target.style.color = 'var(--green)'} onMouseLeave={e => e.target.style.color = 'var(--muted)'}>Avaliação Satélite</Link>
                <span onClick={() => handleNavClick('como-funciona')} style={{ color: 'var(--muted)', cursor: 'pointer' }} onMouseEnter={e => e.target.style.color = 'var(--green)'} onMouseLeave={e => e.target.style.color = 'var(--muted)'}>Como funciona</span>
              </div>
            </div>

            {/* Column 3 */}
            <div>
              <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem', color: 'var(--muted)' }}>Legal</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted)', cursor: 'pointer' }} onMouseEnter={e => e.target.style.color = 'var(--green)'} onMouseLeave={e => e.target.style.color = 'var(--muted)'}>Termos de Uso</span>
                <span style={{ color: 'var(--muted)', cursor: 'pointer' }} onMouseEnter={e => e.target.style.color = 'var(--green)'} onMouseLeave={e => e.target.style.color = 'var(--muted)'}>Política de Privacidade</span>
                <span style={{ color: 'var(--muted)', cursor: 'pointer' }} onMouseEnter={e => e.target.style.color = 'var(--green)'} onMouseLeave={e => e.target.style.color = 'var(--muted)'}>Suporte Técnico</span>
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
            <span>&copy; {new Date().getFullYear()} AgroCarbonIa. Todos os direitos reservados.</span>
            <span className="font-mono">BUILD: v1.0.4 - DARK ONLY MODE</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
