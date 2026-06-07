# 🌍 AgroCarbon IA — Motor de Avaliação de Carbono via Satélite

Repositório oficial do **AgroCarbon IA**: um motor geoespacial que estima o potencial de crédito de carbono de uma propriedade rural em segundos, usando dados reais de satélite e geoprocessamento — sem depender de auditorias de campo demoradas e caras.

🔗 **Demo ao vivo:** [agro-carbon-ia.vercel.app/avaliar](https://agro-carbon-ia.vercel.app/avaliar)
🔗 **API em produção:** [agrocarbonia-api.onrender.com](https://agrocarbonia-api.onrender.com)

## 🚀 O Problema e a Nossa Solução
Auditorias ambientais tradicionais (Monitoramento, Relato e Verificação — MRV) são lentas, caras e burocráticas, excluindo o pequeno e médio produtor do mercado de créditos de carbono.
O AgroCarbon IA resolve isso processando, em segundos, os limites oficiais da propriedade (via CAR/SICAR) cruzados com índices espectrais reais de satélite (Sentinel-2 / NDVI), uso e cobertura do solo (MapBiomas) e carbono orgânico do solo (SoilGrids), tudo via Google Earth Engine.

> O produto está focado exclusivamente no **motor de avaliação real** — sem simulações de marketplace, login/cadastro fictício ou dashboards de demonstração. Cada número exibido na tela é calculado a partir de dado real ou claramente identificado como estimativa de fallback.

## 🛰️ O que é real hoje (e o que ainda é fallback)

| Dado | Fonte | Status |
|---|---|---|
| Limites oficiais da propriedade | SICAR — GeoServer oficial (`geoserver.car.gov.br`) | ✅ Real (com fallback de simulação se o CAR não for encontrado) |
| Área da propriedade | Cálculo geodésico (pyproj, elipsoide WGS84) | ✅ Real |
| NDVI (índice de vegetação) | Sentinel-2 SR Harmonized via Google Earth Engine (mediana 2024, 10m) | ✅ Real (`Dado Real · Sentinel-2`) |
| Uso e cobertura do solo | MapBiomas (coleção pública oficial no GEE, `lulc/v1`) | ✅ Real, com fallback heurístico caso o GEE esteja indisponível |
| Carbono orgânico do solo (COS) | SoilGrids v2.0 (ISRIC), 0–30cm | ✅ Real quando a API do SoilGrids responde; caso contrário aparece como "N/D" |
| Estimativa de sequestro de carbono | IPCC Tier 1 (2006 GL) + fatores calibrados Embrapa (Inventário Nacional GEE) | ✅ Metodologia documentada no próprio laudo |
| Faixa de valor de mercado | Referências Ecosystem Marketplace, Moss.Earth (MCO2), CBIO/B3 | ✅ Faixa calibrada (sem certificação → Verra/Gold Standard) |

## 🛠️ Arquitetura Tecnológica

### 🌿 Frontend (React.js)
- **Mapas interativos:** Leaflet + Esri World Imagery (satélite em alta resolução), com desenho livre de polígono ou injeção automática do polígono oficial vindo do CAR/SICAR.
- **Busca por CAR/SICAR:** consulta direta ao GeoServer oficial do Cadastro Ambiental Rural, trazendo geometria, área e município reais da propriedade.
- **Indicadores de proveniência:** cada métrica do laudo exibe um selo "Dado Real" (com a fonte) ou "Simulação", para deixar claro o que é medido versus estimado.

### 🐍 Backend (Python / FastAPI)
- **Engine geoespacial:** `pyproj`/`Shapely` para cálculo geodésico real de área (elipsoide WGS84) a partir do polígono desenhado ou carregado.
- **Google Earth Engine:** autenticação via Service Account (`earthengine-api`), consultas ao Sentinel-2 (NDVI), MapBiomas (uso do solo) e agregação por `reduceRegion`.
- **SICAR:** integração direta com o GeoServer oficial (WFS/GeoJSON) do Cadastro Ambiental Rural, por estado.
- **SoilGrids:** consulta REST à API da ISRIC para carbono orgânico do solo.
- **Persistência resiliente:** tentativas de gravação em PostgreSQL/PostGIS e MongoDB (log auditável), com fallback gracioso caso indisponíveis.

## ⚙️ Como rodar o projeto localmente

### 1. Subindo o Backend (Python)
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
python main.py          # Roda o servidor na porta 8001
```

> Para usar dados reais de satélite localmente, é necessário configurar a variável de ambiente `GEE_SERVICE_ACCOUNT_JSON` com as credenciais de uma Service Account do Google Earth Engine (Earth Engine Resource Viewer + Service Usage Consumer).

### 2. Subindo o Frontend (React)
```bash
cd frontend
npm install
npm start               # Roda a interface na porta 3002
```

## 📈 Próximos Passos do Roteiro (Roadmap)
- [ ] Calibração regional dos fatores de carbono por bioma (hoje a referência é o Cerrado).
- [ ] Cobertura de mais estados/camadas do SICAR e cache local para reduzir latência.
- [ ] Geração de laudo MRV em PDF totalmente integrado ao backend (hoje parcialmente client-side).

---
*Construído com dado real, sem maquiagem.* 🌱
