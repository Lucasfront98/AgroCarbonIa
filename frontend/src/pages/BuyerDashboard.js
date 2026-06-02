import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { buyerService, evaluationService } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BuyerDashboard = ({ defaultTab }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation state
  const [activeTab, setActiveTab] = useState('geral'); // geral, compras, certificados, metas, config

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Dashboard state data
  const [dashboardData, setDashboardData] = useState(null);
  const [compras, setCompras] = useState([]);
  const [esgGoal, setEsgGoal] = useState(2000);
  const [newEsgGoal, setNewEsgGoal] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);

  // Load buyer data
  const loadData = () => {
    setLoading(true);
    Promise.all([
      buyerService.getDashboardData(),
      buyerService.getCompras(),
    ]).then(([dashRes, comprasRes]) => {
      setDashboardData(dashRes.data);
      setCompras(comprasRes.data);
      setEsgGoal(dashRes.data.metrics.esgGoal);
      setNewEsgGoal(dashRes.data.metrics.esgGoal);
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    setSavingGoal(true);
    try {
      await buyerService.saveEsgGoal(newEsgGoal);
      alert('Meta ESG atualizada!');
      loadData();
    } catch (err) {
      alert('Erro ao atualizar meta.');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleDownloadCertificado = async (compra) => {
    try {
      const response = await evaluationService.generateMrvReport({
        propertyName: compra.farmName,
        state: compra.state,
        area: Math.round(compra.tco2 / 1.5),
        tons: compra.tco2,
        pricePaid: compra.pricePaid,
        vegetation: 'Certificado de Neutralização de Carbono'
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificado_${compra.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Erro ao baixar o certificado.');
    }
  };

  // Layout sidebar icons
  const renderSidebarIcon = (type) => {
    if (type === 'geral') return <span style={{ marginRight: '0.75rem' }}>📊</span>;
    if (type === 'compras') return <span style={{ marginRight: '0.75rem' }}>🛒</span>;
    if (type === 'certificados') return <span style={{ marginRight: '0.75rem' }}>📜</span>;
    if (type === 'metas') return <span style={{ marginRight: '0.75rem' }}>🎯</span>;
    if (type === 'config') return <span style={{ marginRight: '0.75rem' }}>⚙️</span>;
    return null;
  };

  // SVG circle values for ESG progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const esgProgressPct = dashboardData?.metrics?.esgProgressPct || 0;
  const strokeDashoffset = circumference - (Math.min(100, esgProgressPct) / 100) * circumference;

  // Remaining carbon for ESG goals
  const tco2Compensado = dashboardData?.metrics?.tco2Compensado || 0;
  const carbonDeficit = esgGoal - tco2Compensado;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        minHeight: 'calc(100vh - 70px)',
        backgroundColor: 'var(--bg)',
      }}
      className="dashboard-layout"
    >
      
      {/* SIDEBAR - DESKTOP */}
      <aside
        style={{
          backgroundColor: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '2rem 1.5rem',
        }}
        className="dashboard-sidebar-desktop"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { id: 'geral', label: 'Visão Geral' },
            { id: 'compras', label: 'Minhas Compras' },
            { id: 'certificados', label: 'Meus Certificados' },
            { id: 'metas', label: 'Metas ESG' },
            { id: 'config', label: 'Configurações' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
                border: 'none',
                backgroundColor: activeTab === tab.id ? 'var(--surface2)' : 'transparent',
                color: activeTab === tab.id ? 'var(--green)' : 'var(--muted)',
                textAlign: 'left',
                borderLeft: activeTab === tab.id ? '2px solid var(--green)' : '2px solid transparent',
              }}
            >
              {renderSidebarIcon(tab.id)}
              <span className="sidebar-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--green)' }} />
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>EMPRESA PARCEIRA</span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 700 }}>
            CARBON COMPENSATE
          </span>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main style={{ padding: '2.5rem', overflowY: 'auto' }}>
        
        {/* Topbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '1.5rem',
            marginBottom: '2.5rem',
          }}
        >
          <div>
            <span className="font-mono" style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Painel de Comprador ESG
            </span>
            <h2 className="font-clash" style={{ fontSize: '1.8rem', textTransform: 'uppercase' }}>
              {user?.name || 'Comprador Corporativo'}
            </h2>
          </div>
          
          <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
            Logout
          </button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ height: '300px', flexDirection: 'column' }}>
            <div style={{ width: '40px', height: '40px', border: '2px solid var(--border)', borderTop: '2px solid var(--green)', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <span className="font-mono" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', color: 'var(--muted)' }}>Carregando dados do painel...</span>
          </div>
        ) : (
          <>
            {/* TAB: VISÃO GERAL */}
            {activeTab === 'geral' && dashboardData && (
              <div>
                
                {/* 4 Metrics Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                  
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Total Investido</span>
                    <span className="font-mono" style={{ fontSize: '1.8rem', color: 'var(--gold)', fontWeight: 600 }}>
                      R$ {dashboardData.metrics.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Carbono Compensado</span>
                    <span className="font-mono" style={{ fontSize: '1.8rem', color: 'var(--green)', fontWeight: 600 }}>
                      {dashboardData.metrics.tco2Compensado.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>tCO₂</span>
                    </span>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Certificados Emitidos</span>
                    <span className="font-mono" style={{ fontSize: '1.8rem', color: 'var(--text)', fontWeight: 600 }}>
                      {dashboardData.metrics.certificadosCount} <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Títulos</span>
                    </span>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Atingimento Meta ESG</span>
                    <span className="font-mono" style={{ fontSize: '1.8rem', color: 'var(--green)', fontWeight: 600 }}>
                      {dashboardData.metrics.esgProgressPct}%
                    </span>
                  </div>

                </div>

                {/* Grid charts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start', marginBottom: '2.5rem' }} className="grid-2-1">
                  
                  {/* Circular ESG Goal Progress */}
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem', color: 'var(--muted)' }}>Progresso ESG Anual</h4>
                    
                    <div style={{ position: 'relative', width: '130px', height: '130px', marginBottom: '1.5rem' }}>
                      <svg width="100%" height="100%" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="6"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke="var(--green)"
                          strokeWidth="6"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          transform="rotate(-90 50 50)"
                          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                        />
                      </svg>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{esgProgressPct}%</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase' }}>concluído</span>
                      </div>
                    </div>

                    <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {tco2Compensado.toLocaleString()} / {esgGoal.toLocaleString()} tCO₂
                    </span>
                  </div>

                  {/* Monthly Purchases Bar Chart */}
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem', color: 'var(--muted)' }}>Volume Mensal Compensado (tCO₂)</h4>
                    
                    <div style={{ width: '100%', height: '190px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="name" stroke="rgba(240,245,242,0.3)" style={{ fontSize: '0.75rem', fontFamily: 'DM Mono' }} />
                          <YAxis stroke="rgba(240,245,242,0.3)" style={{ fontSize: '0.75rem', fontFamily: 'DM Mono' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text)', borderRadius: 0 }}
                            itemStyle={{ color: 'var(--green)' }}
                          />
                          <Bar dataKey="tco2" fill="#3ddc84" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB: MINHAS COMPRAS */}
            {activeTab === 'compras' && (
              <div>
                <h4 style={{ fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Registro de Compensações</h4>
                
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Cód. Transação</th>
                        <th>Propriedade Rural</th>
                        <th>Estado</th>
                        <th>Créditos tCO₂</th>
                        <th>Total Pago</th>
                        <th>Data</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compras.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                            Você ainda não efetuou nenhuma compensação de carbono.
                          </td>
                        </tr>
                      ) : (
                        compras.map((compra) => (
                          <tr key={compra.id}>
                            <td className="font-mono code" style={{ color: 'var(--muted)' }}>{compra.id}</td>
                            <td style={{ fontWeight: 600 }}>{compra.farmName}</td>
                            <td className="font-mono">{compra.state}</td>
                            <td className="font-mono">{compra.tco2.toLocaleString()} tCO₂</td>
                            <td className="font-mono" style={{ color: 'var(--gold)' }}>R$ {compra.pricePaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="font-mono">{compra.date}</td>
                            <td>
                              <button
                                onClick={() => handleDownloadCertificado(compra)}
                                className="btn btn-ghost"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}
                              >
                                Certificado
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: CERTIFICADOS */}
            {activeTab === 'certificados' && (
              <div>
                <h4 style={{ fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Meus Certificados de Neutralização</h4>
                
                {compras.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border)', backgroundColor: 'var(--surface)' }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📜</span>
                    <h5 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Nenhum certificado disponível</h5>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Efetue aquisições de créditos ecológicos no marketplace para gerar certificados de compensação.</p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '1.5rem',
                    }}
                  >
                    {compras.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          backgroundColor: 'var(--surface)',
                          border: '1px solid var(--border2)',
                          padding: '1.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                            <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>RETRATAÇÃO LEGAL · {c.id}</span>
                            <h4 className="font-clash" style={{ fontSize: '1.25rem', marginTop: '0.25rem', textTransform: 'uppercase' }}>{c.farmName}</h4>
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>📍 {c.state}</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }} className="font-mono">
                            <div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--muted)', display: 'block' }}>COMPENSADO</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.tco2.toLocaleString()} tCO₂</span>
                            </div>
                            <div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--muted)', display: 'block' }}>INVESTIDO</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gold)' }}>R$ {c.pricePaid.toLocaleString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDownloadCertificado(c)}
                          className="btn btn-secondary"
                          style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }}
                        >
                          Baixar PDF
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: METAS ESG */}
            {activeTab === 'metas' && (
              <div style={{ maxWidth: '640px' }}>
                <h4 style={{ fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Planejamento de Metas ESG</h4>
                
                {/* Deficit notice box */}
                {carbonDeficit > 0 ? (
                  <div style={{ backgroundColor: 'rgba(232, 197, 90, 0.05)', border: '1px solid rgba(232, 197, 90, 0.2)', padding: '1.5rem', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>⚠️</span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: '1.5' }}>
                      Você precisa adquirir mais <strong style={{ color: 'var(--gold)', fontFamily: 'DM Mono' }}>{carbonDeficit.toLocaleString()} tCO₂</strong> para atingir sua meta ecológica deste ano ({esgGoal.toLocaleString()} tCO₂).
                    </p>
                    <Link to="/marketplace" className="font-mono" style={{ display: 'inline-block', marginTop: '1rem', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600 }}>
                      VER CRÉDITOS DISPONÍVEIS &rarr;
                    </Link>
                  </div>
                ) : (
                  <div style={{ backgroundColor: 'rgba(61, 220, 132, 0.05)', border: '1px solid rgba(61, 220, 132, 0.2)', padding: '1.5rem', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🏆</span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: '1.5' }}>
                      <strong>Parabéns!</strong> A sua empresa atingiu ou superou 100% da meta de compensação estipulada para este ano fiscal ({esgGoal.toLocaleString()} tCO₂).
                    </p>
                  </div>
                )}

                {/* Progress bar visual */}
                <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem', marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }} className="font-mono">
                    <span>STATUS ATUAL DE COMPENSAÇÃO</span>
                    <span>{tco2Compensado.toLocaleString()} / {esgGoal.toLocaleString()} tCO₂</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--bg)', width: '100%', marginBottom: '1rem' }}>
                    <div style={{ height: '100%', backgroundColor: 'var(--green)', width: `${Math.min(100, (tco2Compensado / esgGoal) * 100)}%` }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    Meta atualiza automaticamente à medida que novas ordens são confirmadas no marketplace.
                  </span>
                </div>

                {/* Edit Form */}
                <form onSubmit={handleSaveGoal} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Meta de Carbono Anual (tCO₂)</label>
                    <input
                      type="number"
                      className="form-input font-mono"
                      value={newEsgGoal}
                      onChange={(e) => setNewEsgGoal(Math.max(1, parseInt(e.target.value) || 0))}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.9rem' }} disabled={savingGoal}>
                    {savingGoal ? 'Salvando meta...' : 'Salvar Nova Meta'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB: CONFIG */}
            {activeTab === 'config' && (
              <div style={{ maxWidth: '600px' }}>
                <h4 style={{ fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Configurações Corporativas</h4>
                
                <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nome da Corporação</label>
                    <input type="text" className="form-input" defaultValue={user?.name} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-mail Administrativo</label>
                    <input type="email" className="form-input" defaultValue={user?.email} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nível de Selo Verde</label>
                    <span className="badge badge-gold" style={{ display: 'inline-flex', marginTop: '0.25rem' }}>PLATINUM CO₂ AGENT</span>
                  </div>
                </div>
              </div>
            )}

          </>
        )}

      </main>

      {/* MOBILE BAR TAB */}
      <nav className="dashboard-bottom-bar-mobile" style={{ display: 'none' }}>
        {[
          { id: 'geral', icon: '📊' },
          { id: 'compras', icon: '🛒' },
          { id: 'certificados', icon: '📜' },
          { id: 'metas', icon: '🎯' },
          { id: 'config', icon: '⚙' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '0.75rem 0',
              fontSize: '1.25rem',
              color: activeTab === tab.id ? 'var(--green)' : 'var(--muted)',
            }}
          >
            {tab.icon}
          </button>
        ))}
      </nav>

      {/* Styles for responsive collapsed modes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1024px) {
          .dashboard-layout {
            grid-template-columns: 80px 1fr !important;
          }
          .sidebar-label {
            display: none !important;
          }
          .dashboard-sidebar-desktop {
            padding: 2rem 0.5rem !important;
            align-items: center;
          }
          .dashboard-sidebar-desktop button {
            justify-content: center !important;
            padding: 1rem 0 !important;
            border-left: none !important;
            border-bottom: 2px solid transparent;
          }
        }
        @media (max-width: 768px) {
          .dashboard-layout {
            grid-template-columns: 1fr !important;
            padding-bottom: 70px !important;
          }
          .dashboard-sidebar-desktop {
            display: none !important;
          }
          .dashboard-bottom-bar-mobile {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 60px;
            background-color: var(--surface);
            border-top: 1px solid var(--border);
            z-index: 99;
          }
          .grid-2-1 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BuyerDashboard;
