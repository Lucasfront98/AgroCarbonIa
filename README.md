# 🌍 AgroCarbon IA - Plataforma de MRV e Créditos de Carbono

Bem-vindo ao repositório oficial do **AgroCarbon IA** – Um motor geoespacial end-to-end construído para democratizar o acesso ao mercado global de créditos de carbono para produtores rurais através de Inteligência Artificial e dados de satélite.

## 🚀 O Problema e a Nossa Solução
Auditorias ambientais tradicionais (Monitoramento, Relato e Verificação - MRV) são lentas, caras e burocráticas, excluindo o pequeno e médio agricultor do mercado de sustentabilidade global.
O AgroCarbon IA resolve isso substituindo semanas de trabalho braçal por **segundos de processamento em nuvem**. Através de nossa API, cruzamos malhas fundiárias com índices de NDVI (Sentinel-2) e histórico de uso do solo (MapBiomas Coleção 8 no *Google Earth Engine*).

## 🛠️ Arquitetura Tecnológica (Enterprise)

### 🌿 Frontend (React.js)
- **Mapas Interativos WebGL:** Leaflet e Esri World Imagery para renderização de propriedades em tempo real (Ultra HD).
- **Busca via SICAR:** Automação que realiza o mock de dados de fronteiras oficiais do Cadastro Ambiental Rural integrado direto na barra lateral.
- **Motor Web3:** Componente de simulação de emissão inteligente (Smart Contracts) para a tokenização do carbono validado na blockchain.

### 🐍 Backend (Python / FastAPI)
- **Engine Geoespacial Computacional:** Uso puro de bibliotecas de manipulação em alto nível (`Geopandas`, `Shapely`) para projeção real de hectares baseados em circunferências desenhadas livremente no frontend.
- **Microserviços de Satélite:** Script conector do **Google Earth Engine (GEE)** `earthengine-api` para invocar varreduras em Petabytes de coleções públicas do MapBiomas e devolver estatísticas (Reducer).
- **Tratamento Resiliente:** Infraestrutura tolerante a falhas rodando `try/except` sobre MongoDB e PostgreSQL/PostGIS para fallback in-memory local.

## ⚙️ Como rodar o projeto localmente

### 1. Subindo o Backend (Python)
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
python main.py          # Roda o servidor na porta 8001
```

### 2. Subindo o Frontend (React)
```bash
cd frontend
npm install
npm start               # Roda a interface na porta 3002
```

## 📈 Próximos Passos do Roteiro (Roadmap)
- [ ] Integração total com APIs ao vivo do Sentinel Hub.
- [ ] Migração de simulação para contrato real Web3 (Solidity/Polygon) para emissão de MRVs.
- [ ] Autenticação de Usuário com Banco de Dados persistido na nuvem da AWS.

---
*Desenvolvido com visão de futuro.* 🌱

