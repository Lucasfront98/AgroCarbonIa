import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { producerService, evaluationService } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ProducerDashboard = ({ defaultTab }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation states
  const [activeTab, setActiveTab] = useState('geral'); // geral, propriedades, creditos, novo-laudo, config

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Property Modal Form States
  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropState, setNewPropState] = useState('MT');
  const [newPropArea, setNewPropArea] = useState(300);
  const [newPropVeg, setNewPropVeg] = useState('60-80% pastagem+reserva');
  const [addingProp, setAddingProp] = useState(false);

  // Publish Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingProperty, setPublishingProperty] = useState(null);
  const [publishPrice, setPublishPrice] = useState(48.00);
  const [publishing, setPublishing] = useState(false);

  // Credit Filter Tab State
  const [creditFilter, setCreditFilter] = useState('Todos');

  // Load dashboard data
  const loadData = () => {
    setLoading(true);
    Promise.all([
      producerService.getDashboardData(),
      producerService.getProperties(),
      producerService.getCredits(),
    ]).then(([dashRes, propsRes, credsRes]) => {
      setDashboardData(dashRes.data);
      setProperties(propsRes.data);
      setCredits(credsRes.data);
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

  // Add property submit
  const handleAddProperty = async (e) => {
    e.preventDefault();
    setAddingProp(true);
    try {
      await producerService.addProperty({
        name: newPropName,
        state: newPropState,
        area: newPropArea,
        vegetation: newPropVeg,
      });
      setShowAddPropModal(false);
      // reset form
      setNewPropName('');
      setNewPropArea(300);
      loadData();
    } catch (err) {
      alert('Erro ao cadastrar propriedade.');
    } finally {
      setAddingProp(false);
    }
  };

  // Publish credits trigger
  const handleOpenPublishModal = (property) => {
    setPublishingProperty(property);
    setPublishPrice(48.00);
    setShowPublishModal(true);
  };

  const handlePublishCreditsSubmit = async () => {
    setPublishing(true);
    try {
      await producerService.publishCredits(publishingProperty.id, publishPrice);
      setShowPublishModal(false);
      setPublishingProperty(null);
      loadData();
    } catch (err) {
      alert('Erro ao publicar lote de crédito.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadLaudo = async (prop) => {
    try {
      const response = await evaluationService.generateMrvReport({
        propertyName: prop.name,
        state: prop.state,
        area: prop.area,
        vegetation: prop.vegetation,
        tons_co2: prop.tons,
        estimated_value_brl: prop.tons * 48.00,
        ndvi_score: prop.ndvi,
        mrv_eligibility_pct: 85
      });
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laudo_MRV_${prop.name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Erro ao baixar o laudo.');
    }
  };

  // Filter Credits List
  const filteredCredits = credits.filter(c => creditFilter === 'Todos' || c.status === creditFilter);

  // Layout sidebar icons
  const renderSidebarIcon = (type) => {
    if (type === 'geral') return <span style={{ marginRight: '0.75rem' }}>📊</span>;
    if (type === 'propriedades') return <span style={{ marginRight: '0.75rem' }}>🏡</span>;
    if (type === 'creditos') return <span style={{ marginRight: '0.75rem' }}>🍃</span>;
    if (type === 'novo-laudo') return <span style={{ marginRight: '0.75rem' }}>🛰️</span>;
    if (type === 'config') return <span style={{ marginRight: '0.75rem' }}>⚙️</span>;
    return null;
  };

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
            { id: 'propriedades', label: 'Minhas Propriedades' },
            { id: 'creditos', label: 'Meus Créditos' },
            { id: 'novo-laudo', label: 'Novo Laudo' },
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
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>CONEXÃO BLOCKCHAIN</span>
          </div>
          <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted2)', wordBreak: 'break-all', display: 'block' }}>
            0x4c88...e8c55a
          </span>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main style={{ padding: '2.5rem', overflowY: 'auto' }}>
        
        {/* Topbar inside dashboard */}
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
              Painel de Produtor Rural
            </span>
            <h2 className="font-clash" style={{ fontSize: '1.8rem', textTransform: 'uppercase' }}>
              {user?.name || 'Produtor Rural'}
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
                
                {/* 4 Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                  
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Receita Total Gerada</span>
                    <span className="font-mono" style={{ fontSize: '1.8rem', color: 'var(--gold)', fontWeight: 600 }}>
                      R$ {dashboardData.metrics.totalGanho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Créditos Disponíveis</span>
                    <span className="font-mono" style={{ fontSize: '1.8rem', color: 'var(--text)', fontWeight: 600 }}>
                      {dashboardData.metrics.disponiveis.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>tCO₂</span>
                    </span>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Créditos Compensados</span>
                    <span className="font-mono" style={{ fontSize: '1.8rem', color: 'var(--green)', fontWeight: 600 }}>
                      {dashboardData.metrics.vendidos.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>tCO₂</span>
                    </span>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Propriedades</span>
                    <span className="font-mono" style={{ fontSize: '1.8rem', color: 'var(--text)', fontWeight: 600 }}>
                      {dashboardData.metrics.propriedadesCount} <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Fazendas</span>
                    </span>
                  </div>

                </div>

                {/* Grid chart & activity */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }} className="grid-2-1">
                  
                  {/* Earnings Chart */}
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
                    <h4 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Evolução de Faturamento Mensal (R$)</h4>
                    
                    <div style={{ width: '100%', height: '240px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboardData.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="name" stroke="rgba(240,245,242,0.3)" style={{ fontSize: '0.75rem', fontFamily: 'DM Mono' }} />
                          <YAxis stroke="rgba(240,245,242,0.3)" style={{ fontSize: '0.75rem', fontFamily: 'DM Mono' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text)', borderRadius: 0, fontFamily: 'Satoshi' }}
                            itemStyle={{ color: 'var(--green)' }}
                          />
                          <Line type="monotone" dataKey="valor" stroke="#3ddc84" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 0 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Activity Feed */}
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
                    <h4 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Atividade Recente</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {dashboardData.feed.map((act) => (
                        <div key={act.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text)' }}>
                            {act.text}
                          </span>
                          <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>
                            {act.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB: PROPRIEDADES */}
            {activeTab === 'propriedades' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1.1rem', textTransform: 'uppercase' }}>Propriedades Avaliadas</h4>
                  <button onClick={() => setShowAddPropModal(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                    + Adicionar Fazenda
                  </button>
                </div>

                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Propriedade</th>
                        <th>Estado</th>
                        <th>Área (ha)</th>
                        <th>Potencial (tCO₂)</th>
                        <th>Score NDVI</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {properties.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td className="font-mono">{p.state}</td>
                          <td className="font-mono">{p.area.toLocaleString()} ha</td>
                          <td className="font-mono">{p.tons.toLocaleString()} tCO₂</td>
                          <td className="font-mono" style={{ color: 'var(--green)' }}>{p.ndvi}</td>
                          <td>
                            <span className={`badge ${
                              p.status === 'Publicado' ? 'badge-blue' : (p.status === 'Verificado' ? 'badge-green' : 'badge-amber')
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleDownloadLaudo(p)}
                              className="btn btn-ghost"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}
                            >
                              Ver Laudo
                            </button>
                            {p.status === 'Verificado' && (
                              <button
                                onClick={() => handleOpenPublishModal(p)}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              >
                                Publicar Créditos
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: MEUS CRÉDITOS */}
            {activeTab === 'creditos' && (
              <div>
                {/* Status Filter Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  {['Todos', 'Disponível', 'Vendido', 'Expirado'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setCreditFilter(status)}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.8rem',
                        border: 'none',
                        borderBottom: creditFilter === status ? '2px solid var(--green)' : 'none',
                        color: creditFilter === status ? 'var(--green)' : 'var(--muted)',
                        backgroundColor: 'transparent',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        letterSpacing: '0.05em'
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>ID do Lote</th>
                        <th>Propriedade</th>
                        <th>Volume (tCO₂)</th>
                        <th>Preço Unitário (BRL)</th>
                        <th>Status</th>
                        <th>Data Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCredits.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                            Nenhum registro de créditos coincidente.
                          </td>
                        </tr>
                      ) : (
                        filteredCredits.map((c) => (
                          <tr key={c.id}>
                            <td className="font-mono code" style={{ color: 'var(--muted)' }}>{c.id}</td>
                            <td style={{ fontWeight: 600 }}>{c.propertyName}</td>
                            <td className="font-mono">{c.tco2.toLocaleString()} tCO₂</td>
                            <td className="font-mono" style={{ color: 'var(--green)' }}>R$ {c.price.toFixed(2)}</td>
                            <td>
                              <span className={`badge ${
                                c.status === 'Vendido' ? 'badge-green' : (c.status === 'Disponível' ? 'badge-blue' : 'badge-amber')
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="font-mono">{c.date}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: NOVO LAUDO */}
            {activeTab === 'novo-laudo' && (
              <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', textTransform: 'uppercase' }}>Submeter Nova Fazenda para Análise</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Seus dados de NDVI e biomassa serão calculados via espectrógrafo.</p>
                </div>
                
                {/* Reusable Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setLoading(true);
                    try {
                      const name = e.target.pname.value;
                      const st = e.target.pstate.value;
                      const ha = parseFloat(e.target.parea.value);
                      const veg = e.target.pveg.value;

                      await producerService.addProperty({
                        name,
                        state: st,
                        area: ha,
                        vegetation: veg,
                      });

                      alert('Propriedade avaliada e salva com sucesso!');
                      setActiveTab('propriedades');
                      loadData();
                    } catch (err) {
                      alert('Erro ao calcular laudo.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2.5rem' }}
                >
                  <div className="form-group">
                    <label className="form-label">Nome da Fazenda</label>
                    <input type="text" name="pname" className="form-input" defaultValue="Fazenda Estrela Verde" required />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Estado</label>
                      <select name="pstate" className="form-select" defaultValue="MT">
                        <option value="MT">Mato Grosso (MT)</option>
                        <option value="MS">Mato Grosso do Sul (MS)</option>
                        <option value="GO">Goiás (GO)</option>
                        <option value="PA">Pará (PA)</option>
                        <option value="PR">Paraná (PR)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Área do lote (ha)</label>
                      <input type="number" name="parea" className="form-input font-mono" defaultValue="420" required />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label className="form-label">Densidade de Cobertura Vegetal</label>
                    <select name="pveg" className="form-select" defaultValue="60-80% pastagem+reserva">
                      <option value=">80% nativa densa">&gt;80% nativa densa (Reserva preservada)</option>
                      <option value="60-80% pastagem+reserva">60-80% pastagem + reserva regulamentar</option>
                      <option value="40-60% uso misto">40-60% uso misto com capoeira</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
                    Processar Laudo e Salvar Imóvel
                  </button>
                </form>
              </div>
            )}

            {/* TAB: CONFIG */}
            {activeTab === 'config' && (
              <div style={{ maxWidth: '600px' }}>
                <h4 style={{ fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Perfil & Segurança</h4>
                
                <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '2rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nome Completo</label>
                    <input type="text" className="form-input" defaultValue={user?.name} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-mail Cadastrado</label>
                    <input type="email" className="form-input" defaultValue={user?.email} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Acesso</label>
                    <input type="text" className="form-input" defaultValue="PRODUTOR RURAL (Vendedor)" disabled />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Status Blockchain Wallet</label>
                    <span className="badge badge-green" style={{ display: 'inline-flex', marginTop: '0.25rem' }}>CONECTADA (AGRO_KEY)</span>
                  </div>
                </div>
              </div>
            )}

          </>
        )}

      </main>

      {/* MOBILE BAR TAB - Renders on <= 768px (managed by responsive classes) */}
      <nav className="dashboard-bottom-bar-mobile" style={{ display: 'none' }}>
        {[
          { id: 'geral', icon: '📊' },
          { id: 'propriedades', icon: '🏡' },
          { id: 'creditos', icon: '🍃' },
          { id: 'novo-laudo', icon: '🛰️' },
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

      {/* ADD PROPERTY MODAL */}
      {showAddPropModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2.5rem' }}>
            <button
              onClick={() => setShowAddPropModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'transparent', fontSize: '1.5rem', color: 'var(--muted)', cursor: 'pointer' }}
            >
              &times;
            </button>
            <h3 className="font-clash" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Cadastrar Propriedade</h3>
            
            <form onSubmit={handleAddProperty}>
              <div className="form-group">
                <label className="form-label">Nome da Propriedade</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  placeholder="Fazenda Nova Esperança"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select
                    className="form-select"
                    value={newPropState}
                    onChange={(e) => setNewPropState(e.target.value)}
                  >
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="GO">GO</option>
                    <option value="PR">PR</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Área Reservada (ha)</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={newPropArea}
                    onChange={(e) => setNewPropArea(Math.max(1, parseInt(e.target.value) || 0))}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Densidade de Cobertura Vegetal</label>
                <select
                  className="form-select"
                  value={newPropVeg}
                  onChange={(e) => setNewPropVeg(e.target.value)}
                >
                  <option value=">80% nativa densa">&gt;80% nativa densa</option>
                  <option value="60-80% pastagem+reserva">60-80% pastagem + reserva</option>
                  <option value="40-60% uso misto">40-60% uso misto</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={addingProp}>
                {addingProp ? 'Cadastrando...' : 'Confirmar e Analisar via Satélite'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PUBLISH TO MARKETPLACE MODAL */}
      {showPublishModal && publishingProperty && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2.5rem' }}>
            <button
              onClick={() => { setShowPublishModal(false); setPublishingProperty(null); }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'transparent', fontSize: '1.5rem', color: 'var(--muted)', cursor: 'pointer' }}
            >
              &times;
            </button>
            <h3 className="font-clash" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Publicar Créditos no Marketplace</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Seus créditos serão tokenizados e listados para compradores corporativos no mercado primário.
            </p>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1.25rem', marginBottom: '1.5rem' }} className="font-mono">
              <div>Fazenda: <strong>{publishingProperty.name}</strong></div>
              <div>Potencial do Lote: <strong>{publishingProperty.tons} tCO₂</strong></div>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Preço Desejado por tCO₂ (BRL)</label>
              <input
                type="number"
                step="0.5"
                className="form-input font-mono"
                value={publishPrice}
                onChange={(e) => setPublishPrice(Math.max(1, parseFloat(e.target.value) || 0))}
                required
              />
            </div>

            <button onClick={handlePublishCreditsSubmit} className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={publishing}>
              {publishing ? 'Lançando créditos na Blockchain...' : 'Concluir Lançamento'}
            </button>
          </div>
        </div>
      )}

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

export default ProducerDashboard;
