import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { marketplaceService, evaluationService } from '../services/api';

const Marketplace = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // State
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [sortBy, setSortBy] = useState('recente'); // 'menor', 'maior', 'recente', 'area'
  
  // Purchase Modal State
  const [selectedListing, setSelectedListing] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');

  // Purchase Success State
  const [successOrder, setSuccessOrder] = useState(null);

  // Fetch listings
  const fetchListings = () => {
    setLoading(true);
    marketplaceService.getListings()
      .then((res) => {
        setListings(res.data);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // Filter & Sort Logic
  const filteredListings = listings
    .filter((item) => {
      const matchSearch =
        item.farmName.toLowerCase().includes(search.toLowerCase()) ||
        item.city.toLowerCase().includes(search.toLowerCase()) ||
        item.state.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase());
      
      const matchType = filterType === 'Todos' || item.type === filterType;
      
      return matchSearch && matchType && item.status === 'Disponível';
    })
    .sort((a, b) => {
      if (sortBy === 'menor') return a.price - b.price;
      if (sortBy === 'maior') return b.price - a.price;
      if (sortBy === 'area') return b.area - a.area;
      // Default: 'recente' (sort by ID or simulated chronological order)
      return b.id.localeCompare(a.id);
    });

  const handleOpenBuyModal = (listing) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/marketplace' } });
      return;
    }
    setSelectedListing(listing);
    setPurchaseQuantity(Math.min(100, listing.tco2));
    setBuyError('');
  };

  const handleConfirmPurchase = async () => {
    if (purchaseQuantity <= 0 || purchaseQuantity > selectedListing.tco2) {
      setBuyError(`Por favor insira um valor entre 1 e ${selectedListing.tco2} tCO₂`);
      return;
    }

    setBuying(true);
    setBuyError('');
    try {
      const res = await marketplaceService.createOrder(selectedListing.id, purchaseQuantity);
      setSuccessOrder(res.data);
      setSelectedListing(null);
      // Refresh listing quantities
      fetchListings();
    } catch (err) {
      setBuyError(err.response?.data?.message || 'Ocorreu um erro no processamento da compra.');
    } finally {
      setBuying(false);
    }
  };

  const handleDownloadCertificate = async (order) => {
    try {
      const response = await evaluationService.generateMrvReport({
        propertyName: order.farmName,
        area: Math.round(order.quantity / 1.5),
        tons: order.quantity,
        pricePaid: order.totalPaid,
        state: 'N/A',
        vegetation: 'Crédito Adquirido via Marketplace'
      });
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificado_${order.orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Erro ao fazer download do certificado.');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', padding: '3rem 0' }}>
      <div className="container">
        
        {/* Header Title */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '2rem', marginBottom: '3rem' }}>
          <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Catálogo Ativo</span>
          <h1 className="font-clash" style={{ fontSize: '2.5rem', textTransform: 'uppercase', marginTop: '0.5rem' }}>Créditos Disponíveis</h1>
        </div>

        {/* Filter Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1.5rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '3rem',
          }}
        >
          {/* Search and Pills */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
            <input
              type="text"
              placeholder="Buscar fazenda, cidade, estado ou ID..."
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: '340px', fontSize: '0.9rem', padding: '0.6rem 1rem' }}
            />
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Todos', 'Florestal', 'Agropecuário', 'Regenerativo'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                    backgroundColor: filterType === type ? 'var(--green)' : 'var(--surface)',
                    color: filterType === type ? 'var(--bg)' : 'var(--text)',
                    borderColor: filterType === type ? 'var(--green)' : 'var(--border)',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>ORDENAR:</span>
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '0.5rem 2rem 0.5rem 1rem', fontSize: '0.85rem', width: 'auto', backgroundColor: 'var(--surface)' }}
            >
              <option value="recente">Mais recente</option>
              <option value="menor">Menor Preço</option>
              <option value="maior">Maior Preço</option>
              <option value="area">Maior Área</option>
            </select>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex-center" style={{ padding: '6rem 0', flexDirection: 'column' }}>
            <div style={{ width: '40px', height: '40px', border: '2px solid var(--border)', borderTop: '2px solid var(--green)', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <span className="font-mono" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', color: 'var(--muted)' }}>Carregando Lotes...</span>
          </div>
        ) : filteredListings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem', border: '1px dashed var(--border)', backgroundColor: 'var(--surface)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🍂</span>
            <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Nenhum lote disponível</h4>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Nenhum crédito de carbono coincide com seus termos de filtro atuais.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '2rem',
            }}
          >
            {filteredListings.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'var(--transition)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--green)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
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

                  <h3 className="font-clash" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{item.farmName}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '1.5rem' }}>
                    📍 {item.city}, {item.state}
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1rem 0', marginBottom: '1.5rem' }} className="font-mono">
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Área total</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{item.area.toLocaleString()} ha</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Média NDVI</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--green)' }}>{item.ndvi}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Carbono disp.</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{item.tco2.toLocaleString()} tCO₂</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Validade</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{item.expiryDate.split('-')[0]}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Preço unitário</span>
                    <span className="font-mono" style={{ fontSize: '1.25rem', color: 'var(--green)', fontWeight: 500 }}>R$ {item.price.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => handleOpenBuyModal(item)}
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1.5rem', fontSize: '0.8rem' }}
                  >
                    Comprar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* PURCHASE INTERACTIVE MODAL */}
      {selectedListing && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2.5rem' }}>
            <button
              onClick={() => setSelectedListing(null)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}
            >
              &times;
            </button>

            <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem' }}>
              Confirmar Aquisição · {selectedListing.id}
            </span>
            <h3 className="font-clash" style={{ fontSize: '1.75rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>{selectedListing.farmName}</h3>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.5rem' }} className="font-mono">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--muted)' }}>Preço por tCO₂:</span>
                <span>R$ {selectedListing.price.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--muted)' }}>Disponível para Compra:</span>
                <span>{selectedListing.tco2.toLocaleString()} tCO₂</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Origem / Estado:</span>
                <span>{selectedListing.city} - {selectedListing.state}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quantidade de Carbono a Comprar (tCO₂)</label>
              <input
                type="number"
                min="1"
                max={selectedListing.tco2}
                className="form-input font-mono"
                value={purchaseQuantity}
                onChange={(e) => setPurchaseQuantity(Math.min(selectedListing.tco2, Math.max(1, parseInt(e.target.value) || 0)))}
                style={{ fontSize: '1.25rem', padding: '0.75rem 1rem' }}
              />
            </div>

            {/* Total price calculation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>VALOR TOTAL DA COMPRA</span>
                <span className="font-mono" style={{ fontSize: '1.75rem', color: 'var(--gold)', fontWeight: 600 }}>
                  R$ {(purchaseQuantity * selectedListing.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {buyError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                {buyError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setSelectedListing(null)}
                className="btn btn-ghost"
                style={{ flex: 1, padding: '1rem' }}
                disabled={buying}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="btn btn-primary"
                style={{ flex: 2, padding: '1rem' }}
                disabled={buying}
              >
                {buying ? 'Processando transação...' : 'Confirmar Compra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {successOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '3rem', textAlign: 'center', borderColor: 'var(--green)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1.5rem' }}>🚀</span>
            <h3 className="font-clash" style={{ fontSize: '1.75rem', color: 'var(--green)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Transação Concluída</h3>
            <span className="font-mono code" style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '2rem' }}>
              ID: {successOrder.orderId}
            </span>

            <p style={{ color: 'var(--text)', fontSize: '1rem', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem auto', lineHeight: '1.6' }}>
              Você adquiriu com sucesso <strong style={{ color: 'var(--green)' }}>{successOrder.quantity.toLocaleString()} tCO₂</strong> da <strong style={{ textTransform: 'uppercase' }}>{successOrder.farmName}</strong>. 
              Os títulos ambientais foram custodiados e registrados na blockchain.
            </p>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1.5rem', maxWidth: '320px', margin: '0 auto 2.5rem auto' }} className="font-mono">
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Pago</span>
              <span style={{ fontSize: '1.5rem', color: 'var(--gold)', fontWeight: 600 }}>
                R$ {successOrder.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                onClick={() => handleDownloadCertificate(successOrder)}
                className="btn btn-primary"
                style={{ padding: '1rem' }}
              >
                Baixar Certificado PDF
              </button>
              <button
                onClick={() => {
                  setSuccessOrder(null);
                  navigate('/dashboard/comprador/compras');
                }}
                className="btn btn-ghost"
                style={{ padding: '1rem', border: '1px solid var(--border)' }}
              >
                Visualizar minhas compras
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global spinning keyframe overlay */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Marketplace;
