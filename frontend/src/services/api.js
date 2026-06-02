import axios from 'axios';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const MOCK_MODE = true;

const api = axios.create({
  baseURL: API_URL,
});

// Request Interceptor: add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agro_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('agro_token');
      localStorage.removeItem('agro_user');
      localStorage.removeItem('agro_role');
      window.dispatchEvent(new Event('agro_auth_logout'));
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ----------------------------------------------------
// STATEFUL MOCK DATA LAYER (persist in localStorage)
// ----------------------------------------------------
const SEED_LISTINGS = [
  {
    id: 'ACB-2025-0001',
    type: 'Florestal',
    farmName: 'Fazenda Novo Horizonte',
    city: 'Sorriso',
    state: 'MT',
    area: 1240,
    ndvi: 0.82,
    tco2: 1860,
    expiryDate: '2028-12-31',
    price: 48.00,
    status: 'Disponível',
  },
  {
    id: 'ACB-2025-0002',
    type: 'Regenerativo',
    farmName: 'Estância Bela Vista',
    city: 'Rio Verde',
    state: 'GO',
    area: 950,
    ndvi: 0.74,
    tco2: 1280,
    expiryDate: '2027-06-30',
    price: 52.50,
    status: 'Disponível',
  },
  {
    id: 'ACB-2025-0003',
    type: 'Agropecuário',
    farmName: 'Sítio Ipê Amarelo',
    city: 'Ponta Grossa',
    state: 'PR',
    area: 420,
    ndvi: 0.68,
    tco2: 560,
    expiryDate: '2026-10-15',
    price: 45.00,
    status: 'Disponível',
  },
  {
    id: 'ACB-2025-0004',
    type: 'Florestal',
    farmName: 'Fazenda Santa Tereza',
    city: 'Dourados',
    state: 'MS',
    area: 2100,
    ndvi: 0.88,
    tco2: 3150,
    expiryDate: '2030-04-20',
    price: 55.00,
    status: 'Disponível',
  },
  {
    id: 'ACB-2025-0005',
    type: 'Regenerativo',
    farmName: 'Recanto do Vale',
    city: 'Barreiras',
    state: 'BA',
    area: 1540,
    ndvi: 0.71,
    tco2: 1980,
    expiryDate: '2028-09-12',
    price: 49.90,
    status: 'Disponível',
  },
  {
    id: 'ACB-2025-0006',
    type: 'Agropecuário',
    farmName: 'Fazenda Santa Rita',
    city: 'Ribeirão Preto',
    state: 'SP',
    area: 880,
    ndvi: 0.65,
    tco2: 920,
    expiryDate: '2026-12-01',
    price: 42.50,
    status: 'Disponível',
  },
  {
    id: 'ACB-2025-0007',
    type: 'Florestal',
    farmName: 'Reserva Paragominas',
    city: 'Paragominas',
    state: 'PA',
    area: 3400,
    ndvi: 0.92,
    tco2: 5800,
    expiryDate: '2032-03-15',
    price: 58.00,
    status: 'Disponível',
  },
  {
    id: 'ACB-2025-0008',
    type: 'Regenerativo',
    farmName: 'Fazenda Terra Preta',
    city: 'Sinop',
    state: 'MT',
    area: 1650,
    ndvi: 0.79,
    tco2: 2450,
    expiryDate: '2029-08-30',
    price: 51.00,
    status: 'Disponível',
  }
];

const SEED_PROPERTIES = [
  {
    id: 'prop-1',
    ownerEmail: 'produtor@agro.com.br',
    name: 'Fazenda Novo Horizonte',
    state: 'MT',
    area: 1240,
    vegetation: '60-80% pastagem+reserva',
    status: 'Publicado',
    tons: 1860,
    ndvi: 0.82,
  },
  {
    id: 'prop-2',
    ownerEmail: 'produtor@agro.com.br',
    name: 'Fazenda Três Barras',
    state: 'MS',
    area: 620,
    vegetation: '>80% nativa densa',
    status: 'Verificado',
    tons: 1116,
    ndvi: 0.89,
  },
  {
    id: 'prop-3',
    ownerEmail: 'produtor@agro.com.br',
    name: 'Estância Sol Nascente',
    state: 'GO',
    area: 450,
    vegetation: '40-60% uso misto',
    status: 'Pendente',
    tons: 472,
    ndvi: 0.58,
  }
];

const SEED_CREDITS = [
  {
    id: 'ACB-2025-0001',
    propertyId: 'prop-1',
    ownerEmail: 'produtor@agro.com.br',
    propertyName: 'Fazenda Novo Horizonte',
    tco2: 1860,
    price: 48.00,
    status: 'Disponível',
    date: '2025-05-10',
  },
  {
    id: 'ACB-2025-0009',
    propertyId: 'prop-2',
    ownerEmail: 'produtor@agro.com.br',
    propertyName: 'Fazenda Três Barras',
    tco2: 1116,
    price: 52.00,
    status: 'Disponível',
    date: '2025-05-15',
  },
  {
    id: 'ACB-2025-0010',
    propertyId: 'prop-1',
    ownerEmail: 'produtor@agro.com.br',
    propertyName: 'Fazenda Novo Horizonte (Lote Antigo)',
    tco2: 1200,
    price: 45.00,
    status: 'Vendido',
    date: '2025-02-14',
  }
];

const SEED_COMPRAS = [
  {
    id: 'ORD-2025-9981',
    buyerEmail: 'comprador@esg.com.br',
    farmName: 'Fazenda Santa Tereza',
    state: 'MS',
    tco2: 500,
    pricePaid: 27500.00,
    date: '2026-05-24',
    status: 'Concluído',
  },
  {
    id: 'ORD-2025-9982',
    buyerEmail: 'comprador@esg.com.br',
    farmName: 'Recanto do Vale',
    state: 'BA',
    tco2: 300,
    pricePaid: 14970.00,
    date: '2026-05-18',
    status: 'Concluído',
  }
];

const initializeMockDB = () => {
  if (!localStorage.getItem('agro_listings')) {
    localStorage.setItem('agro_listings', JSON.stringify(SEED_LISTINGS));
  }
  if (!localStorage.getItem('agro_properties')) {
    localStorage.setItem('agro_properties', JSON.stringify(SEED_PROPERTIES));
  }
  if (!localStorage.getItem('agro_credits')) {
    localStorage.setItem('agro_credits', JSON.stringify(SEED_CREDITS));
  }
  if (!localStorage.getItem('agro_compras')) {
    localStorage.setItem('agro_compras', JSON.stringify(SEED_COMPRAS));
  }
  if (!localStorage.getItem('agro_esg_goal')) {
    localStorage.setItem('agro_esg_goal', '2000');
  }
  if (!localStorage.getItem('agro_users')) {
    localStorage.setItem('agro_users', JSON.stringify([
      { name: 'Produtor Teste', email: 'produtor@agro.com.br', password: '123', role: 'produtor' },
      { name: 'Comprador Teste', email: 'comprador@esg.com.br', password: '123', role: 'comprador' }
    ]));
  }
};

initializeMockDB();

const getFromLS = (key) => JSON.parse(localStorage.getItem(key));
const setToLS = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const delayResponse = (data, delay = 800) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data });
    }, delay);
  });
};

const delayError = (message, status = 400, delay = 800) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message);
      error.response = { status, data: { message } };
      reject(error);
    }, delay);
  });
};

// ----------------------------------------------------
// API FUNCTIONS
// ----------------------------------------------------

export const authService = {
  login: async (email, password) => {
    if (MOCK_MODE) {
      const users = getFromLS('agro_users') || [];
      const found = users.find((u) => u.email === email && u.password === password);
      if (found) {
        const token = 'mock-jwt-token-for-' + found.email;
        localStorage.setItem('agro_token', token);
        localStorage.setItem('agro_user', JSON.stringify(found));
        localStorage.setItem('agro_role', found.role);
        return delayResponse({ user: found, token, role: found.role });
      }
      return delayError('Credenciais inválidas. Use produtor@agro.com.br / 123 ou comprador@esg.com.br / 123', 401);
    }
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  register: async (name, email, password, role) => {
    if (MOCK_MODE) {
      const users = getFromLS('agro_users') || [];
      if (users.some((u) => u.email === email)) {
        return delayError('E-mail já cadastrado.', 400);
      }
      const newUser = { name, email, password, role };
      users.push(newUser);
      setToLS('agro_users', users);
      // Auto login on successful register
      const token = 'mock-jwt-token-for-' + email;
      localStorage.setItem('agro_token', token);
      localStorage.setItem('agro_user', JSON.stringify(newUser));
      localStorage.setItem('agro_role', role);
      return delayResponse({ user: newUser, token, role });
    }
    const response = await api.post('/api/auth/register', { name, email, password, role });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('agro_token');
    localStorage.removeItem('agro_user');
    localStorage.removeItem('agro_role');
    if (MOCK_MODE) {
      return Promise.resolve();
    }
    return Promise.resolve();
  }
};

export const marketplaceService = {
  getListings: async () => {
    if (MOCK_MODE) {
      const listings = getFromLS('agro_listings') || [];
      return delayResponse(listings);
    }
    const response = await api.get('/api/listings');
    return response.data;
  },

  createOrder: async (listingId, quantity) => {
    if (MOCK_MODE) {
      const listings = getFromLS('agro_listings') || [];
      const index = listings.findIndex((l) => l.id === listingId);
      if (index === -1) {
        return delayError('Crédito não encontrado.', 404);
      }
      
      const listing = listings[index];
      if (listing.tco2 < quantity) {
        return delayError('Quantidade indisponível.', 400);
      }

      // Update available quantity
      listing.tco2 -= quantity;
      if (listing.tco2 === 0) {
        listing.status = 'Vendido';
      }
      listings[index] = listing;
      setToLS('agro_listings', listings);

      // Add to Purchases
      const user = getFromLS('agro_user');
      const compras = getFromLS('agro_compras') || [];
      const newPurchase = {
        id: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        buyerEmail: user ? user.email : 'comprador@esg.com.br',
        farmName: listing.farmName,
        state: listing.state,
        tco2: quantity,
        pricePaid: quantity * listing.price,
        date: new Date().toISOString().split('T')[0],
        status: 'Concluído',
      };
      compras.unshift(newPurchase);
      setToLS('agro_compras', compras);

      return delayResponse({
        orderId: newPurchase.id,
        farmName: listing.farmName,
        quantity,
        totalPaid: newPurchase.pricePaid,
        success: true
      });
    }
    const response = await api.post('/api/orders', { listingId, quantity });
    return response.data;
  }
};

export const evaluationService = {
  evaluate: async ({ state, area_ha, vegetation_cover, land_use }) => {
    if (MOCK_MODE) {
      // tons = area * vegetation_factor * type_factor * 1.5
      let vegFactor = 0.5;
      if (vegetation_cover === '>80% nativa densa') vegFactor = 1.0;
      else if (vegetation_cover === '60-80% pastagem+reserva') vegFactor = 0.8;
      else if (vegetation_cover === '40-60% uso misto') vegFactor = 0.6;
      else if (vegetation_cover === '20-40% agricultura') vegFactor = 0.4;

      let useFactor = 0.6;
      if (land_use === 'Florestal/Reserva') useFactor = 1.2;
      else if (land_use === 'Agropecuária com reserva') useFactor = 0.8;
      else if (land_use === 'Agricultura intensiva+faixa verde') useFactor = 0.5;

      const tons = Math.round(area_ha * vegFactor * useFactor * 1.5);
      const estimatedValue = tons * 48.00;
      
      // Calculate NDVI: Dense native yields higher NDVI
      let ndvi = 0.45;
      if (vegetation_cover === '>80% nativa densa') ndvi = 0.85 + Math.random() * 0.08;
      else if (vegetation_cover === '60-80% pastagem+reserva') ndvi = 0.72 + Math.random() * 0.06;
      else if (vegetation_cover === '40-60% uso misto') ndvi = 0.58 + Math.random() * 0.05;
      else ndvi = 0.45 + Math.random() * 0.05;
      ndvi = parseFloat(ndvi.toFixed(2));

      // Calculate MRV eligibility:
      let mrv = 50;
      if (vegetation_cover === '>80% nativa densa' && land_use === 'Florestal/Reserva') mrv = 95;
      else if (vegetation_cover === '60-80% pastagem+reserva') mrv = 80;
      else if (vegetation_cover === '40-60% uso misto') mrv = 65;
      else mrv = 45;
      mrv = Math.min(100, Math.max(0, mrv + Math.floor(Math.random() * 5)));

      return delayResponse({
        tons_co2: tons,
        estimated_value_brl: estimatedValue,
        ndvi_score: ndvi,
        mrv_eligibility_pct: mrv
      });
    }
    const response = await api.post('/api/evaluate', { state, area_ha, vegetation_cover, land_use });
    return response.data;
  },

  generateMrvReport: async (reportData) => {
    if (MOCK_MODE) {
      // Simulate creating and downloading a PDF
      const docContent = `
        AGROCARBONIA - LAUDO TECNICO MRV DE CARBONO
        ===========================================
        Data: ${new Date().toLocaleDateString('pt-BR')}
        Propriedade: ${reportData.propertyName || 'Fazenda Analisada'}
        Estado: ${reportData.state || 'N/A'}
        Area Total: ${reportData.area_ha || reportData.area || 0} ha
        Cobertura Vegetal: ${reportData.vegetation_cover || reportData.vegetation || 'N/A'}
        Uso do Solo: ${reportData.land_use || 'N/A'}
        
        RESULTADO DA ANALISE VIA SATELITE DE ALTA RESOLUCAO
        --------------------------------------------------
        Score NDVI: ${reportData.ndvi_score || reportData.ndvi || 0.65}
        Elegibilidade MRV: ${reportData.mrv_eligibility_pct || 80}%
        Potencial Estável de Sequestro: ${reportData.tons_co2 || reportData.tons || 0} tCO2/ano
        Valor Estimado Anual: R$ ${(reportData.estimated_value_brl || reportData.pricePaid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        
        AUTORIZADO VIA PROTOCOLO BLOCKCHAIN AGROCARBONIA
        Assinatura Digital: SHA-256 e8c55a3ddc8409100d0f1a14162010
      `;
      const blob = new Blob([docContent], { type: 'application/pdf' });
      return delayResponse(blob);
    }
    const response = await api.post('/api/mrv-report', reportData, { responseType: 'blob' });
    return response.data;
  }
};

export const producerService = {
  getProperties: async () => {
    if (MOCK_MODE) {
      const user = getFromLS('agro_user');
      const allProps = getFromLS('agro_properties') || [];
      const userProps = allProps.filter((p) => p.ownerEmail === (user ? user.email : 'produtor@agro.com.br'));
      return delayResponse(userProps);
    }
    const response = await api.get('/api/propriedades');
    return response.data;
  },

  addProperty: async (propData) => {
    if (MOCK_MODE) {
      const user = getFromLS('agro_user');
      const allProps = getFromLS('agro_properties') || [];
      
      // Calculate tons and ndvi based on details
      let vegFactor = 0.5;
      if (propData.vegetation === '>80% nativa densa') vegFactor = 1.0;
      else if (propData.vegetation === '60-80% pastagem+reserva') vegFactor = 0.8;
      else if (propData.vegetation === '40-60% uso misto') vegFactor = 0.6;
      else vegFactor = 0.4;

      const tons = Math.round(propData.area * vegFactor * 1.2 * 1.5);
      const ndvi = parseFloat((0.55 + Math.random() * 0.35).toFixed(2));

      const newProp = {
        id: `prop-${Math.floor(1000 + Math.random() * 9000)}`,
        ownerEmail: user ? user.email : 'produtor@agro.com.br',
        name: propData.name,
        state: propData.state,
        area: parseFloat(propData.area),
        vegetation: propData.vegetation,
        status: 'Pendente',
        tons,
        ndvi
      };

      allProps.unshift(newProp);
      setToLS('agro_properties', allProps);

      return delayResponse(newProp);
    }
    const response = await api.post('/api/propriedades', propData);
    return response.data;
  },

  getCredits: async () => {
    if (MOCK_MODE) {
      const user = getFromLS('agro_user');
      const credits = getFromLS('agro_credits') || [];
      const userCredits = credits.filter((c) => c.ownerEmail === (user ? user.email : 'produtor@agro.com.br'));
      return delayResponse(userCredits);
    }
    const response = await api.get('/api/creditos');
    return response.data;
  },

  publishCredits: async (propertyId, price) => {
    if (MOCK_MODE) {
      const allProps = getFromLS('agro_properties') || [];
      const propIndex = allProps.findIndex((p) => p.id === propertyId);
      if (propIndex === -1) return delayError('Propriedade não encontrada', 404);
      
      allProps[propIndex].status = 'Publicado';
      setToLS('agro_properties', allProps);

      const prop = allProps[propIndex];
      const user = getFromLS('agro_user');
      const credits = getFromLS('agro_credits') || [];

      // Create new active listing in marketplace
      const newListing = {
        id: `ACB-2025-${Math.floor(1000 + Math.random() * 9000)}`,
        type: prop.vegetation.includes('nativa') ? 'Florestal' : (prop.vegetation.includes('pastagem') ? 'Agropecuário' : 'Regenerativo'),
        farmName: prop.name,
        city: 'Município Verificado',
        state: prop.state,
        area: prop.area,
        ndvi: prop.ndvi,
        tco2: prop.tons,
        expiryDate: '2029-12-31',
        price: parseFloat(price) || 48.00,
        status: 'Disponível',
      };

      const listings = getFromLS('agro_listings') || [];
      listings.unshift(newListing);
      setToLS('agro_listings', listings);

      // Create active credit in producer dashboard
      const newCredit = {
        id: newListing.id,
        propertyId: prop.id,
        ownerEmail: user ? user.email : 'produtor@agro.com.br',
        propertyName: prop.name,
        tco2: prop.tons,
        price: newListing.price,
        status: 'Disponível',
        date: new Date().toISOString().split('T')[0],
      };
      credits.unshift(newCredit);
      setToLS('agro_credits', credits);

      return delayResponse(newCredit);
    }
    // real implementation ...
  },

  getDashboardData: async () => {
    if (MOCK_MODE) {
      const user = getFromLS('agro_user');
      const email = user ? user.email : 'produtor@agro.com.br';
      
      const properties = (getFromLS('agro_properties') || []).filter((p) => p.ownerEmail === email);
      const credits = (getFromLS('agro_credits') || []).filter((c) => c.ownerEmail === email);

      const totalGanho = credits
        .filter((c) => c.status === 'Vendido')
        .reduce((sum, c) => sum + (c.tco2 * c.price), 0) + 487200; // adding baseline mock earnings

      const disponiveis = credits
        .filter((c) => c.status === 'Disponível')
        .reduce((sum, c) => sum + c.tco2, 0);

      const vendidos = credits
        .filter((c) => c.status === 'Vendido')
        .reduce((sum, c) => sum + c.tco2, 0) + 1200; // adding baseline tCO2

      const chartData = [
        { name: 'Dez', valor: 45000 },
        { name: 'Jan', valor: 58000 },
        { name: 'Fev', valor: 89000 },
        { name: 'Mar', valor: 72000 },
        { name: 'Abr', valor: 110000 },
        { name: 'Mai', valor: totalGanho > 110000 ? totalGanho / 4 : 95000 },
      ];

      const feed = [
        { id: 'act-1', text: 'Créditos do lote ACB-2025-0010 foram compensados.', time: '2 dias atrás', type: 'sale' },
        { id: 'act-2', text: 'Laudo da propriedade Fazenda Novo Horizonte aprovado.', time: '5 dias atrás', type: 'approval' },
        { id: 'act-3', text: 'Estância Sol Nascente cadastrada para análise satélite.', time: '1 semana atrás', type: 'register' },
      ];

      return delayResponse({
        metrics: {
          totalGanho,
          disponiveis,
          vendidos,
          propriedadesCount: properties.length
        },
        chartData,
        feed
      });
    }
    const response = await api.get('/api/dashboard/produtor');
    return response.data;
  }
};

export const buyerService = {
  getCompras: async () => {
    if (MOCK_MODE) {
      const user = getFromLS('agro_user');
      const email = user ? user.email : 'comprador@esg.com.br';
      const compras = getFromLS('agro_compras') || [];
      const userCompras = compras.filter((c) => c.buyerEmail === email);
      return delayResponse(userCompras);
    }
    const response = await api.get('/api/compras');
    return response.data;
  },

  getEsgGoal: async () => {
    if (MOCK_MODE) {
      const goal = parseInt(localStorage.getItem('agro_esg_goal') || '2000');
      return delayResponse({ goal });
    }
    const response = await api.get('/api/esg-goal');
    return response.data;
  },

  saveEsgGoal: async (goal) => {
    if (MOCK_MODE) {
      localStorage.setItem('agro_esg_goal', goal.toString());
      return delayResponse({ goal });
    }
    const response = await api.post('/api/esg-goal', { goal });
    return response.data;
  },

  getDashboardData: async () => {
    if (MOCK_MODE) {
      const compras = await buyerService.getCompras();
      const goalRes = await buyerService.getEsgGoal();
      const userCompras = compras.data;
      const esgGoal = goalRes.data.goal;

      const totalInvestido = userCompras.reduce((sum, c) => sum + c.pricePaid, 0);
      const tco2Compensado = userCompras.reduce((sum, c) => sum + c.tco2, 0);
      const certificadosCount = userCompras.length;
      
      const esgProgressPct = Math.round((tco2Compensado / esgGoal) * 100);

      // Monthly Purchase Bar Chart
      const chartData = [
        { name: 'Dez', tco2: 150 },
        { name: 'Jan', tco2: 300 },
        { name: 'Fev', tco2: 200 },
        { name: 'Mar', tco2: 450 },
        { name: 'Abr', tco2: 100 },
        { name: 'Mai', tco2: tco2Compensado > 0 ? tco2Compensado : 250 },
      ];

      return delayResponse({
        metrics: {
          totalInvestido,
          tco2Compensado,
          certificadosCount,
          esgGoal,
          esgProgressPct
        },
        chartData
      });
    }
    const response = await api.get('/api/dashboard/comprador');
    return response.data;
  }
};

export default api;
