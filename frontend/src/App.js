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

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://agrocarbonia-api.onrender.com";

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Subcomponente para mover o mapa programaticamente
function MapController({ centerCoordinates }) {
  const map = useMap();
  useEffect(() => {
    if (centerCoordinates) {
      map.flyTo(centerCoordinates, 13); // Zoom 13 para nível de fazenda/cidade
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
  // Estados para simulação financeira / NFT Web3
  const [mintStatus, setMintStatus] = useState("idle"); // idle, minting, success
  const [nftData, setNftData] = useState(null);

  const fetchCarInfo = async () => {
    if (!carInput) return;
    setLoading(true);
    setCarGeojson(null);
    setMetrics(null);
    setMintStatus("idle");
    try {
        const res = await fetch(`${API_BASE_URL}/api/fetch-car/${carInput}`);
        const data = await res.json();
        
        if (res.ok && data.status === 'success') {
            const geojsonLayer = data.geojson;
            setCarGeojson(geojsonLayer);
            
            // Pega uma das coordenadas para focar a câmera no satélite
            const coords = geojsonLayer.features[0].geometry.coordinates[0][0];
            setMapCenter([coords[1], coords[0]]); // Leaflet inverte para [lat, lng]
            
            // Auto-Gatilho do MRV de Carbono para essa área baixada!
            const postRes = await fetch(`${API_BASE_URL}/api/analyze-farm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geojsonLayer)
            });
            const postData = await postRes.json();
            if (postData.status === 'success') setMetrics(postData.metrics);
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
            alert("Localidade não encontrada. Tente outra cidade ou use coordenadas.");
        }
    } catch (err) {
        alert("Erro ao buscar localidade via OpenStreetMap.");
    } finally {
        setLoading(false);
    }
  };

  const handleSearch = () => {
    if (latInput && lngInput) {
      setMapCenter([parseFloat(latInput), parseFloat(lngInput)]);
    }
  };

  const simulateNftMinting = () => {
    setMintStatus("minting");
    setTimeout(() => {
       const mockHash = "0x" + Math.random().toString(16).slice(2, 10) + "..." + Math.random().toString(16).slice(2, 6);
       setNftData(mockHash);
       setMintStatus("success");
    }, 2500);
  };

  const resetSelection = () => {
    setMetrics(null);
    setCarGeojson(null);
    setMintStatus("idle");
    setNftData(null);
  };

  const onCreated = async (e) => {
    const layer = e.layer;
    const geojson = layer.toGeoJSON();
    
    // Constrói o GeoJSON completo da FeatureCollection
    const payload = {
        type: "FeatureCollection",
        features: [geojson]
    };

    setLoading(true);
    setMintStatus("idle");
    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze-farm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        if (data.status === 'success') {
             setMetrics(data.metrics);
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

  return (
    <div className="app-container">
      {/* Sidebar: Dashboard */}
      <div className="sidebar">
        <div className="sidebar-header">
           <h2>AgroCarbon <span>IA</span></h2>
           <p>Terminal MRV de Carbono</p>
        </div>
        
        <div className="dashboard-content">
           <div className="search-box" style={{ background: "rgba(76, 175, 80, 0.15)", border: "1px solid var(--accent)" }}>
             <input 
                type="text" 
                placeholder="Nº SICAR (Ex: MT-12345-ABC)" 
                value={carInput} 
                onChange={e => setCarInput(e.target.value)}
             />
             <button onClick={fetchCarInfo} className="btn-search" style={{ background: "var(--accent)", color: "white" }}>Baixar Área</button>
           </div>
           
           <hr style={{ margin: "15px 0", borderColor: "rgba(255,255,255,0.05)" }} />

           <div className="search-box">
             <input 
                type="text" 
                placeholder="Buscar por Cidade, Estado ou Fazenda..." 
                value={searchInput} 
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter') handleTextSearch(); }} 
             />
             <button onClick={handleTextSearch} className="btn-search"><i className="fa-solid fa-magnifying-glass">Buscar</i></button>
           </div>
           
           <details style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
             <summary style={{ cursor: 'pointer', fontSize: '0.85rem' }}>Desejo buscar por latitude e longitude exata</summary>
             <div className="search-box" style={{ marginTop: '10px', marginBottom: '0' }}>
               <input 
                  type="number" 
                  placeholder="Lat (Ex: -14.23)" 
                  value={latInput} 
                  onChange={e => setLatInput(e.target.value)} 
               />
               <input 
                  type="number" 
                  placeholder="Lng (Ex: -51.92)" 
                  value={lngInput} 
                  onChange={e => setLngInput(e.target.value)} 
               />
               <button onClick={handleSearch} className="btn-search">Ir</button>
             </div>
           </details>

           {loading ? (
               <div className="loading-state">
                   <div className="spinner"></div>
                   <p>Acessando Satélites (Mock)... <br/>Processando Biomassa...</p>
               </div>
           ) : metrics ? (
               <div className="metrics-grid">
                   <div className="metric-card">
                       <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         Área Mapeada 
                         <small style={{ backgroundColor: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>Cálculo Real</small>
                       </span>
                       <h3>{metrics.area_ha} <small>Hectares</small></h3>
                       <p className="subtitle" style={{ fontSize: '0.8rem' }}>Medição Geoespacial Cirúrgica da Geometria Desenhada</p>
                   </div>

                   <div className="metric-card" style={{ borderLeftColor: "#f39c12" }}>
                       <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         Classe do Solo (MapBiomas)
                         <small style={{ backgroundColor: '#f39c12', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>Simulação API</small>
                       </span>
                       <h3 style={{ fontSize: '1.2rem', marginTop: '10px'}}>{metrics.land_use}</h3>
                       <p className="subtitle" style={{ fontSize: '0.8rem' }}>No futuro, validará se houve desmatamento.</p>
                   </div>

                   <div className="metric-card">
                       <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         Índice de Saúde (NDVI)
                         <small style={{ backgroundColor: '#f39c12', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>Simulação API</small>
                       </span>
                       <h3>{metrics.ndvi_avg}</h3>
                       <p className="subtitle" style={{ fontSize: '0.8rem' }}>Infravermelho do Satélite Sentinel-2.</p>
                   </div>

                   <div className="metric-card highlight">
                       <span>Total de Sequestro Estimado</span>
                       <h3>{metrics.carbon_tco2e} <small>tCO2e</small></h3>
                       <p className="subtitle" style={{ fontSize: '0.85rem', margin: '5px 0' }}>
                         Arquitetura Avançada: Combinação precisa do Histórico de Solo do MapBiomas com o Vigor Foliar Mensal do satélite.
                       </p>
                       <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(52, 152, 219, 0.2)', border: '1px solid #3498db', borderRadius: '4px' }}>
                           <span style={{color: '#3498db', fontWeight: 'bold', display: 'block'}}>Oportunidade de Mercado:</span>
                           <h4 style={{ margin: '5px 0', fontSize: '1.4rem' }}>💰 US$ {metrics.estimated_value_usd.toLocaleString('en-US')}</h4>
                           <small>Cotação Média Atual: ~$18.50 / Tonelada</small>
                       </div>
                   </div>
                   
                   {mintStatus === "idle" && (
                       <button className="btn-mint" onClick={simulateNftMinting} style={{ marginTop: '15px' }}>
                           Mintar Certificado NFT 💎
                       </button>
                   )}
                   
                   {mintStatus === "minting" && (
                       <div style={{ textAlign: 'center', margin: '20px 0', color: 'orange' }}>
                           <p>⏳ Empacotando dados no Contrato Smart...</p>
                       </div>
                   )}

                   {mintStatus === "success" && (
                       <div style={{ marginTop: '15px', background: '#27ae60', padding: '15px', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
                           <h4 style={{ margin: '0 0 10px 0' }}>✅ Certificado Gerado com Sucesso!</h4>
                           <p style={{ margin: '0', fontSize: '0.9rem' }}>Blockchain Hash:</p>
                           <code style={{ background: 'rgba(0,0,0,0.3)', padding: '5px', borderRadius: '4px', fontSize: '1.1rem' }}>{nftData}</code>
                           <p style={{ margin: '15px 0 0 0', fontSize: '0.85rem' }}>O ativo ambiental agora é rastreável e negociável na Web3.</p>
                       </div>
                   )}
                   
                   <button className="btn-reset" onClick={resetSelection} style={{ marginTop: '10px' }}>
                       Nova Análise
                   </button>
               </div>
           ) : (
               <div className="instruction-state">
                   <h3>Novo Mapeamento</h3>
                   <ol>
                       <li>Arraste o mapa para a localização da sua propriedade.</li>
                       <li>Clique no ícone de polígono (⬟) no menu do mapa.</li>
                       <li>Contorne visualmente o limite da sua fazenda.</li>
                       <li>Clique no primeiro ponto para fechar a área e aguarde o cálculo geospacial do Backend.</li>
                   </ol>
               </div>
           )}
        </div>
      </div>
      
      {/* Área do Mapa */}
      <div className="map-wrapper">
         {/* Centralizado no Brasil */}
         <MapContainer center={[-14.235, -51.925]} zoom={5} style={{ height: "100%", width: "100%" }}>
            <MapController centerCoordinates={mapCenter} />
            
            {/* TileLayer de Satélite Base (Esri World Imagery) */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Satélite &copy; Esri"
            />
            {/* TileLayer de Cidades e Fronteiras SOBREPOSTO ao Satélite */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution="Cidades &copy; Esri"
            />
            
            {/* Camada Dinâmica quando baixamos um CAR federal */}
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
                       drawError: { 
                         color: '#e1e100', 
                         message: '<strong>Aviso:</strong> Limites da fazenda não podem se cruzar.'
                       },
                       shapeOptions: { 
                         color: '#2ecc71', 
                         fillColor: '#27ae60', 
                         fillOpacity: 0.5 
                       }
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
