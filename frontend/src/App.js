import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap, GeoJSON } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './App.css';

// Fix para ícones padrão do Leaflet no React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Subcomponente para mover o mapa programaticamente
function MapController({ centerCoordinates }) {
  const map = useMap();
  useEffect(() => {
    if (centerCoordinates) {
      map.flyTo(centerCoordinates, 13);
    }
  }, [centerCoordinates, map]);
  return null;
}

function App() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [carInput, setCarInput] = useState("");
  const [carGeojson, setCarGeojson] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  
  // Estados de Cadastro
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', farm_name: '' });

  // Estados do Simulador Atual
  const [simPrice, setSimPrice] = useState(18.5);
  const [simLandUse, setSimLandUse] = useState("");

  // NOVO: Portfólio de Áreas (Inventário)
  const [portfolio, setPortfolio] = useState([]);
  const [viewTab, setViewTab] = useState("analise"); // 'analise', 'portfolio', 'banco'

  const handleRegister = async (e) => {
    e.preventDefault();
    if(!regForm.name || !regForm.email) return;
    setLoading(true);
    try {
       const res = await fetch(`${API_BASE_URL}/api/register`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(regForm)
       });
       if(res.ok) {
           setUser(regForm);
           setShowModal(false);
       } else {
           setUser(regForm);
           setShowModal(false);
       }
    } catch(err) {
       console.error("Erro no cadastro", err);
       setUser(regForm);
       setShowModal(false);
    } finally {
       setLoading(false);
    }
  };

  const addAreaToPortfolio = (newMetrics) => {
      const areaRecord = {
          id: Math.random().toString(36).substring(7),
          date: new Date().toLocaleString(),
          ...newMetrics
      };
      setPortfolio(prev => [...prev, areaRecord]);
  };

  const fetchCarInfo = async () => {
    if (!carInput) return;
    setLoading(true);
    setCarGeojson(null);
    setMetrics(null);
    setViewTab("analise");
    try {
        const res = await fetch(`${API_BASE_URL}/api/fetch-car/${carInput}`);
        const data = await res.json();
        
        if (res.ok && data.status === 'success') {
            const geojsonLayer = data.geojson;
            setCarGeojson(geojsonLayer);
            
            const coords = geojsonLayer.features[0].geometry.coordinates[0][0];
            setMapCenter([coords[1], coords[0]]);
            
            const postRes = await fetch(`${API_BASE_URL}/api/analyze-farm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geojsonLayer)
            });
            const postData = await postRes.json();
            if (postData.status === 'success') {
                setMetrics(postData.metrics);
                setSimLandUse(postData.metrics.land_use);
                addAreaToPortfolio(postData.metrics);
            }
        } else {
            alert(data.detail || "Cadastro não encontrado na Base do Governo.");
        }
    } catch (err) {
        alert("Erro ao conectar à malha do SICAR Nacional.");
    } finally {
        setLoading(false);
    }
  };

  const handleTextSearch = async () => {
    if (!searchInput) return;
    setLoading(true);
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}`);
        const results = await res.json();
        if(results && results.length > 0) {
            const { lat, lon } = results[0];
            setMapCenter([parseFloat(lat), parseFloat(lon)]);
        } else {
            alert("Localidade não encontrada.");
        }
    } catch (err) {
        alert("Erro ao buscar localidade via OpenStreetMap.");
    } finally {
        setLoading(false);
    }
  };

  const onCreated = async (e) => {
    const layer = e.layer;
    const geojson = layer.toGeoJSON();
    const payload = { type: "FeatureCollection", features: [geojson] };

    setLoading(true);
    setViewTab("analise");
    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze-farm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        if (data.status === 'success') {
             setMetrics(data.metrics);
             setSimLandUse(data.metrics.land_use);
             addAreaToPortfolio(data.metrics);
        } else {
             alert(data.detail || "Erro processando malha geométrica da fazenda.");
        }
    } catch(err) {
        console.error(err);
        alert("Erro na conexão com o Backend AgroCarbon.");
    } finally {
        setLoading(false);
    }
  };

  // Exportar para CSV
  const exportToCSV = () => {
      if(portfolio.length === 0) return;
      
      const headers = "ID,Data,Area (ha),Uso do Solo,NDVI,Carbono (tCO2e),Valor (USD)\n";
      const rows = portfolio.map(item => 
          `${item.id},"${item.date}",${item.area_ha},"${item.land_use}",${item.ndvi_avg},${item.carbon_tco2e},${item.estimated_value_usd}`
      ).join("\n");
      
      const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "Portfolio_AgroCarbon.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Funções do Simulador Atual
  const calculateSimulatedCarbon = () => {
    if (!metrics) return 0;
    const landUse = simLandUse || metrics.land_use;
    let baseFactor = 11.5; 
    if (landUse.includes("Integração")) baseFactor = 25.5;
    else if (landUse.includes("Pastagem")) baseFactor = 14.2;
    
    return Number((metrics.area_ha * baseFactor * (metrics.ndvi_avg / 0.5)).toFixed(2));
  };
  
  const simCarbon = calculateSimulatedCarbon();
  const simValue = Number((simCarbon * simPrice).toFixed(2));
  const getWaterRetention = () => metrics ? Number((metrics.area_ha * metrics.ndvi_avg * 100).toFixed(0)) : 0;

  // Cálculos do Portfólio Consolidados
  const totalArea = portfolio.reduce((acc, curr) => acc + curr.area_ha, 0).toFixed(2);
  const totalCarbon = portfolio.reduce((acc, curr) => acc + curr.carbon_tco2e, 0).toFixed(2);
  const totalUSD = portfolio.reduce((acc, curr) => acc + curr.estimated_value_usd, 0);

  // Lógica do Banco (Empréstimo Lastreado em Carbono)
  // Limite de crédito = 60% do valor do carbono (LTV - Loan to Value 60%)
  const creditLimit = totalUSD * 0.60;

  return (
    <div className="app-container">
      {/* MODAL DE CADASTRO */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>🌍 Bem-vindo ao AgroCarbon IA</h2>
            <p>Por favor, identifique-se para acessar o terminal MRV.</p>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Nome Completo</label>
                <input type="text" required value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} placeholder="Ex: João da Silva" />
              </div>
              <div className="form-group">
                <label>E-mail Corporativo</label>
                <input type="email" required value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} placeholder="joao@fazenda.com" />
              </div>
              <div className="form-group">
                <label>Nome da Propriedade (Opcional)</label>
                <input type="text" value={regForm.farm_name} onChange={e => setRegForm({...regForm, farm_name: e.target.value})} placeholder="Fazenda Boa Vista" />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Conectando...' : 'Acessar Terminal Web3'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar: Dashboard */}
      <div className="sidebar">
        <div className="sidebar-header">
           <h2>AgroCarbon <span>IA</span></h2>
           <p>Terminal MRV {user ? `- Olá, ${user.name.split(' ')[0]}` : ''}</p>
        </div>

        {/* Tab Navigation */}
        <div className="tabs">
            <button className={`tab-btn ${viewTab === 'analise' ? 'active' : ''}`} onClick={() => setViewTab('analise')}>Analise Atual</button>
            <button className={`tab-btn ${viewTab === 'portfolio' ? 'active' : ''}`} onClick={() => setViewTab('portfolio')}>Portfólio ({portfolio.length})</button>
            <button className={`tab-btn ${viewTab === 'banco' ? 'active' : ''}`} onClick={() => setViewTab('banco')}>Bank 🏦</button>
        </div>
        
        <div className="dashboard-content">
           {viewTab === 'analise' && (
               <>
                   <div className="search-box" style={{ background: "rgba(76, 175, 80, 0.15)", border: "1px solid var(--accent)" }}>
                     <input type="text" placeholder="Nº SICAR (Ex: MT-1234)" value={carInput} onChange={e => setCarInput(e.target.value)}/>
                     <button onClick={fetchCarInfo} className="btn-search" style={{ background: "var(--accent)", color: "white" }}>Baixar</button>
                   </div>
                   
                   <div className="search-box">
                     <input type="text" placeholder="Buscar por Cidade..." value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleTextSearch(); }} />
                     <button onClick={handleTextSearch} className="btn-search">Ir</button>
                   </div>

                   {loading ? (
                       <div className="loading-state">
                           <div className="spinner"></div>
                           <p>Processando Dados Orbitais...</p>
                       </div>
                   ) : metrics ? (
                       <div className="metrics-grid">
                           <div className="metric-card">
                               <span>Área Mapeada</span>
                               <h3>{metrics.area_ha} <small>ha</small></h3>
                           </div>

                           <div className="metric-card highlight">
                               <span>Desempenho Atual</span>
                               <h3>{metrics.carbon_tco2e} <small>tCO2e</small></h3>
                               <p className="subtitle">Uso: {metrics.land_use}</p>
                               <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(52, 152, 219, 0.2)', borderRadius: '4px' }}>
                                   <h4 style={{ margin: 0 }}>💰 US$ {metrics.estimated_value_usd.toLocaleString('en-US')}</h4>
                               </div>
                           </div>

                           <div className="simulator-section">
                             <h4>🔬 Simulador de Cenários</h4>
                             <div className="simulator-control">
                                <label>Preço do Carbono (US$) <span style={{color: 'white', fontWeight: 'bold'}}>${simPrice.toFixed(2)}</span></label>
                                <input type="range" min="5" max="50" step="0.5" value={simPrice} onChange={(e) => setSimPrice(Number(e.target.value))} />
                             </div>
                             <div className="simulator-control">
                                <label>Projeto de Melhoria de Solo</label>
                                <select value={simLandUse} onChange={(e) => setSimLandUse(e.target.value)}>
                                   <option value="Agricultura (Plantio Direto)">Agricultura (Plantio Direto)</option>
                                   <option value="Pastagem Bem Manejada">Pastagem Bem Manejada</option>
                                   <option value="Integração Lavoura-Pecuária-Floresta (ILPF)">Investir em Agrofloresta (ILPF)</option>
                                </select>
                             </div>
                             <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginTop: '10px' }}>
                                <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Projeção Simulada:</span>
                                <h3 style={{color: '#2ecc71', margin: '5px 0'}}>{simCarbon} tCO2e</h3>
                                <h2 style={{color: '#3498db', fontSize: '1.5rem'}}>💰 US$ {simValue.toLocaleString('en-US')}</h2>
                             </div>
                           </div>
                       </div>
                   ) : (
                       <div className="instruction-state">
                           <h3>Novo Mapeamento</h3>
                           <ol>
                               <li>Arraste o mapa para a sua fazenda.</li>
                               <li>Clique no ícone de polígono (⬟).</li>
                               <li>Contorne a área desejada.</li>
                               <li>Clique no ponto inicial para fechar.</li>
                           </ol>
                       </div>
                   )}
               </>
           )}

           {viewTab === 'portfolio' && (
               <div className="metrics-grid">
                   <h3 style={{ color: 'var(--accent)' }}>Inventário Consolidado</h3>
                   
                   <div className="metric-card highlight" style={{ borderLeftColor: '#f1c40f', background: 'rgba(241, 196, 15, 0.1)' }}>
                       <span>Total de Áreas Mapeadas: {portfolio.length}</span>
                       <h3 style={{color: '#f1c40f'}}>{totalArea} <small style={{color:'#f1c40f'}}>ha</small></h3>
                       <p style={{ marginTop: '10px' }}>🌍 <b>{totalCarbon} tCO2e</b> Sequestrados</p>
                       <p style={{ marginTop: '5px', fontSize: '1.2rem', color: '#2ecc71', fontWeight: 'bold' }}>💰 US$ {totalUSD.toLocaleString('en-US')}</p>
                   </div>

                   <button className="btn-primary" onClick={exportToCSV} style={{ marginTop: '10px' }}>
                       📥 Baixar Relatório (Excel/CSV)
                   </button>

                   <div style={{ marginTop: '20px' }}>
                     <h4 style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>Histórico de Lotes:</h4>
                     {portfolio.length === 0 && <p style={{fontSize: '0.8rem'}}>Nenhuma área mapeada ainda.</p>}
                     {portfolio.map((item, idx) => (
                         <div key={item.id} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', marginBottom: '10px', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                            <p style={{ fontSize: '0.8rem', color: 'gray' }}>{item.date}</p>
                            <p style={{ fontWeight: 'bold' }}>Lote {idx + 1} - {item.area_ha} ha</p>
                            <p style={{ fontSize: '0.9rem' }}>{item.land_use}</p>
                            <p style={{ color: '#2ecc71', marginTop: '5px' }}>US$ {item.estimated_value_usd.toLocaleString('en-US')}</p>
                         </div>
                     ))}
                   </div>
               </div>
           )}

           {viewTab === 'banco' && (
               <div className="metrics-grid">
                   <h3 style={{ color: '#3498db' }}>AgroCarbon Bank 🏛️</h3>
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Use seus ativos ambientais como garantia (lastro) para linhas de crédito sustentáveis com taxas reduzidas (Cédula de Produto Rural Verde).</p>
                   
                   <div className="metric-card" style={{ borderLeftColor: '#3498db', background: 'rgba(52, 152, 219, 0.1)' }}>
                       <span>Carteira Ativa Atual</span>
                       <h3>US$ {totalUSD.toLocaleString('en-US')}</h3>
                   </div>

                   <div className="metric-card highlight" style={{ borderLeftColor: '#9b59b6', background: 'rgba(155, 89, 182, 0.2)' }}>
                       <span>Limite de Crédito Pré-Aprovado</span>
                       <h3 style={{ color: '#e056fd' }}>US$ {creditLimit.toLocaleString('en-US')}</h3>
                       <p className="subtitle">LTV (Loan-to-Value) de 60%</p>
                       <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>Taxa de Juros Especial: <b>3.5% a.a.</b> (Linha ESG)</p>
                   </div>

                   {portfolio.length > 0 ? (
                       <button className="btn-primary" style={{ background: '#3498db' }} onClick={() => alert('Proposta enviada ao BNDES/Banco Parceiro para análise do lastro ambiental!')}>
                           Solicitar Empréstimo Agora 🚀
                       </button>
                   ) : (
                       <p style={{ color: 'orange', fontSize: '0.8rem', textAlign: 'center' }}>Você precisa mapear áreas no portfólio para gerar limite de crédito.</p>
                   )}
               </div>
           )}
        </div>
      </div>
      
      {/* Área do Mapa */}
      <div className="map-wrapper">
         <MapContainer center={[-14.235, -51.925]} zoom={5} style={{ height: "100%", width: "100%" }}>
            <MapController centerCoordinates={mapCenter} />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Satélite &copy; Esri"
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution="Cidades &copy; Esri"
            />
            
            {carGeojson && (
                <GeoJSON 
                   key={JSON.stringify(carGeojson)} 
                   data={carGeojson} 
                   style={{ color: "#e67e22", fillOpacity: 0.3, weight: 3 }}
                />
            )}
            
            <FeatureGroup>
               <EditControl
                 position="topright"
                 onCreated={onCreated}
                 draw={{
                   rectangle: false,
                   circle: false,
                   circlemarker: false,
                   marker: false,
                   polyline: false,
                   polygon: {
                       allowIntersection: false,
                       shapeOptions: { color: '#2ecc71', fillColor: '#27ae60', fillOpacity: 0.5 }
                   }
                 }}
               />
            </FeatureGroup>
         </MapContainer>
      </div>
    </div>
  );
}

export default App;
