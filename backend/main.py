import os
import time
import random
from datetime import datetime
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from geoalchemy2 import Geometry
from geoalchemy2.shape import from_shape
from pymongo import MongoClient

import pyproj
from shapely.geometry import shape

# Bibliotecas de Sensoriamento Remoto
import ee

app = FastAPI(title="AgroCarbon IA API", description="Motor Geoespacial para Cálculo de Carbono")

# Permite que o Frontend React faça requisições sem bloqueio do navegador
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# 1. Configurações de Bancos de Dados
# ==========================================================
# PostgreSQL com PostGIS
PG_URL = os.getenv("DATABASE_URL", "")
# Render usa 'postgres://' por padrão, mas o SQLAlchemy 2.0+ exige 'postgresql://'
if PG_URL and PG_URL.startswith("postgres://"):
    PG_URL = PG_URL.replace("postgres://", "postgresql://", 1)

SessionLocal = None
engine = None
Base = declarative_base()

class FarmArea(Base):
    __tablename__ = "farm_areas"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Fazenda Não Nomeada")
    geom = Column(Geometry(geometry_type='POLYGON', srid=4326))
    area_hectares = Column(Float)
    ndvi_avg = Column(Float)
    carbon_tco2e = Column(Float)

if PG_URL and "localhost" not in PG_URL and "127.0.0.1" not in PG_URL:
    try:
        engine = create_engine(PG_URL, connect_args={'connect_timeout': 3})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception as e:
        print(f"Aviso: Falha ao inicializar o engine do BD: {e}")
else:
    print("Aviso: PostgreSQL URL é local ou ausente. Modo Fallback (salvamento no BD relacional desativado).")

@app.on_event("startup")
def startup_db_check():
    import sys
    print("Verificando conexão com o Banco de Dados...", flush=True)
    if engine:
        try:
            Base.metadata.create_all(bind=engine)
            print("PostgreSQL conectado e tabelas carregadas com sucesso!", flush=True)
        except Exception as e:
            print(f"Aviso Crítico: Erro ao conectar ao PostgreSQL - {e}", flush=True)
    sys.stdout.flush()

# MongoDB
MONGO_URL = os.getenv("MONGO_URL", "")
logs_collection = None

if MONGO_URL and "localhost" not in MONGO_URL:
    try:
        mongo_client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=2000)
        mongo_db = mongo_client["agrocarbon_db"]
        logs_collection = mongo_db["analysis_logs"]
    except Exception as e:
        print(f"Aviso: MongoDB falhou ao conectar. {e}")
else:
    print("Aviso: MongoDB não configurado na nuvem. Usando Fallback.")

@app.get("/")
def read_root():
    return {"status": "AgroCarbon IA API no ar!", "version": "v2.1.0-calibrated"}

# ==========================================================
# 2. Modelos Pydantic (Entradas da API)
# ==========================================================
class GeoJSONPayload(BaseModel):
    type: str
    features: list

class UserRegistration(BaseModel):
    name: str
    email: str
    phone: str
    farm_name: str

# ==========================================================
# 3. Rotas da API e Lógica Matemática (MRV)
# ==========================================================

@app.post("/api/register")
async def register_user(user: UserRegistration):
    """
    Registra um novo usuário no sistema.
    """
    try:
        print(f"Novo usuário registrado: {user.name} - {user.email}")
        return {"status": "success", "message": "Usuário cadastrado com sucesso!", "user": user.dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/fetch-car/{car_number}")
async def fetch_car(car_number: str):
    """
    Mock de integração com o SICAR/Governo Federal e APIs Especializadas (MapBiomas/Agrotools).
    Recebe um número de CAR e retorna o GeoJSON (Polígono) oficial da propriedade.
    """
    if "-" not in car_number:
        raise HTTPException(status_code=400, detail="Formato de CAR inválido. Ex: MT-12345-ABCD...")

    # Gerador de coordenada base aleatória dentro do Brasil Central (MT/GO/MS)
    base_lng = round(random.uniform(-56.0, -50.0), 4)
    base_lat = round(random.uniform(-16.0, -10.0), 4)
    offset_lat = random.uniform(0.02, 0.08)
    offset_lng = random.uniform(0.02, 0.08)

    feature = {
        "type": "Feature",
        "properties": {
            "registro_oficial": car_number.upper(),
            "origem": "Mock_SICAR_Federal_API",
            "status": "Ativo - Adequado Legalmente"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [base_lng, base_lat],
                [base_lng, base_lat + offset_lat],
                [base_lng + offset_lng, base_lat + offset_lat],
                [base_lng + offset_lng, base_lat],
                [base_lng, base_lat]
            ]]
        }
    }

    return {
        "status": "success",
        "geojson": {
            "type": "FeatureCollection",
            "features": [feature]
        }
    }


@app.post("/api/analyze-farm")
async def analyze_farm(payload: GeoJSONPayload):
    """
    Recebe um GeoJSON do Frontend, extrai o polígono, calcula área e estimativas de carbono.
    Fatores calibrados conforme IPCC Tier 1 e Embrapa (Inventário Nacional de GEE - Cerrado/Amazônia).
    Preço de mercado baseado no mercado voluntário BR 2024-2025 (sem certificação Verra/Gold Standard).
    """
    try:
        if not payload.features:
            raise HTTPException(status_code=400, detail="Nenhum polígono encontrado.")

        # Extrai a geometria do GeoJSON (WGS 84 - Coordenadas Geográficas)
        geom_dict = payload.features[0]['geometry']
        polygon = shape(geom_dict)

        # ===============================================================
        # PROCESSAMENTO MATEMÁTICO VIA ELIPSOIDE WGS84 (Puro Python)
        # ===============================================================
        geod = pyproj.Geod(ellps="WGS84")
        area_sq_meters, _ = geod.geometry_area_perimeter(polygon)
        area_hectares = abs(area_sq_meters) / 10000.0

        if area_hectares <= 0.01:
            raise HTTPException(status_code=400, detail="Área desenhada é pequena demais.")

        # ===============================================================
        # NDVI: Valor conservador fixo até integração real com GEE/Sentinel-2
        # Referência: NDVI médio de áreas agrícolas brasileiras = 0.50-0.60
        # Fonte: Embrapa Monitoramento por Satélite
        # ATENÇÃO: substituir mock_ndvi_avg pelo valor real do GEE quando
        # a autenticação da Service Account estiver configurada.
        # ===============================================================
        ndvi_is_real = False
        ndvi_avg = 0.55  # valor médio-conservador para simulação

        predominant_use = None

        # ---------------------------------------------------------------
        # INTEGRAÇÃO REAL COM GOOGLE EARTH ENGINE E MAPBIOMAS (quando disponível)
        # ---------------------------------------------------------------
        try:
            ee.Initialize(project='seu-projeto-gcp-aqui')
            print("Earth Engine Conectado. Buscando Asset MapBiomas Coleção 8.0...")

            coords = payload.features[0]["geometry"]["coordinates"]
            ee_geom = ee.Geometry.Polygon(coords)

            # NDVI real via Sentinel-2 (bandas B8=NIR, B4=Red)
            sentinel2 = (
                ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(ee_geom)
                .filterDate('2024-01-01', '2024-12-31')
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
                .median()
            )
            ndvi_image = sentinel2.normalizedDifference(['B8', 'B4']).rename('NDVI')
            ndvi_stats = ndvi_image.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=ee_geom,
                scale=10,
                maxPixels=1e9
            ).getInfo()
            ndvi_real = ndvi_stats.get('NDVI')
            if ndvi_real is not None:
                ndvi_avg = round(float(ndvi_real), 3)
                ndvi_is_real = True
                print(f"NDVI real obtido do Sentinel-2: {ndvi_avg}")

            # Uso do solo via MapBiomas
            mapbiomas_asset = ee.Image('projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1')
            band_names = mapbiomas_asset.bandNames().getInfo()
            latest_year_band = band_names[-1]
            latest_image = mapbiomas_asset.select(latest_year_band)

            stats = latest_image.reduceRegion(
                reducer=ee.Reducer.mode(),
                geometry=ee_geom,
                scale=30,
                maxPixels=1e9
            ).getInfo()

            class_id = stats.get(latest_year_band)

            if class_id == 15:
                predominant_use = "Pastagem Bem Manejada"
            elif class_id in [39, 41, 19, 20]:
                predominant_use = "Agricultura (Plantio Direto)"
            elif class_id == 3:
                predominant_use = "Reserva Legal (Floresta Intacta)"
            else:
                predominant_use = "Integração Lavoura-Pecuária-Floresta (ILPF)"

        except Exception as e:
            print(f"GEE não autenticado. Fallback para simulação. Erro: {e}")

        # Fallback de uso do solo se GEE não disponível
        if not predominant_use:
            land_uses = [
                "Pastagem Bem Manejada",
                "Agricultura (Plantio Direto)",
                "Integração Lavoura-Pecuária-Floresta (ILPF)"
            ]
            predominant_use = random.choice(land_uses)

        # ===============================================================
        # FATORES DE CARBONO CALIBRADOS
        # Fonte: IPCC Tier 1 (2006 GL) + Embrapa Inventário Nacional GEE
        # Bioma de referência: Cerrado (dominante no agronegócio BR)
        # Unidade: tCO2e / ha / ano (sequestro líquido estimado)
        #
        # ILPF:              10-18 tCO2e/ha  → mediana conservadora: 12.0
        # Pastagem manejada:  3-8  tCO2e/ha  → mediana conservadora:  5.0
        # Plantio direto:     1-4  tCO2e/ha  → mediana conservadora:  3.5
        # Floresta intacta:  15-25 tCO2e/ha  → mediana conservadora: 18.0
        #
        # Para certificação Verra/Gold Standard, exige-se baseline
        # site-specific. Estes valores são estimativas de triagem (screening).
        # ===============================================================
        carbon_factors = {
            "Integração Lavoura-Pecuária-Floresta (ILPF)": 12.0,
            "Pastagem Bem Manejada": 5.0,
            "Agricultura (Plantio Direto)": 3.5,
            "Reserva Legal (Floresta Intacta)": 18.0,
        }
        base_factor = carbon_factors.get(predominant_use, 5.0)

        # Ajuste pelo NDVI: normalizado em torno de 0.55 (média BR)
        # Limita o multiplicador entre 0.7x e 1.3x para evitar distorções
        ndvi_multiplier = max(0.7, min(1.3, ndvi_avg / 0.55))
        carbon_factor_per_ha = base_factor * ndvi_multiplier
        total_carbon_sequestrated = round(area_hectares * carbon_factor_per_ha, 2)

        # ===============================================================
        # PREÇO DE MERCADO CALIBRADO
        # Fonte: Moss.Earth MCO2, CBIO B3, relatório Ecosystem Marketplace 2024
        #
        # Mercado voluntário BR sem certificação:  US$ 5-10/tCO2e
        # Com certificação Verra VCS:             US$ 12-20/tCO2e
        # CBIO (mercado regulado, biocombustíveis): R$ 30-50/crédito
        #
        # Usamos US$ 7.50 como referência conservadora sem certificação.
        # Exibir faixa ao usuário é mais honesto do que um valor único.
        # ===============================================================
        PRICE_LOW_USD = 5.00    # sem certificação, mercado spot
        PRICE_MID_USD = 7.50    # referência conservadora
        PRICE_HIGH_USD = 15.00  # com certificação Verra/Gold Standard

        estimated_value_low = round(total_carbon_sequestrated * PRICE_LOW_USD, 2)
        estimated_value_mid = round(total_carbon_sequestrated * PRICE_MID_USD, 2)
        estimated_value_high = round(total_carbon_sequestrated * PRICE_HIGH_USD, 2)

        # SALVAR NO POSTGRES (PostGIS)
        if SessionLocal:
            db = SessionLocal()
            try:
                pg_polygon = shape(payload.features[0]["geometry"])
                new_farm = FarmArea(
                    geom=from_shape(pg_polygon, srid=4326),
                    area_hectares=area_hectares,
                    ndvi_avg=ndvi_avg,
                    carbon_tco2e=total_carbon_sequestrated
                )
                db.add(new_farm)
                db.commit()
            except Exception as pg_err:
                print(f"Não comunicou com PostGIS, fallback ativado. {pg_err}")
                db.rollback()
            finally:
                db.close()

        # SALVAR NO MONGODB (Log Auditável)
        if logs_collection is not None:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "algo_version": "v2.1.0-calibrated",
                "feature": payload.features[0],
                "satellite_metadata": {
                    "source": "Sentinel-2 & MapBiomas",
                    "ndvi_is_real": ndvi_is_real,
                    "resolution_m": 10 if ndvi_is_real else None
                },
                "results": {
                    "area_ha": area_hectares,
                    "ndvi": ndvi_avg,
                    "ndvi_source": "GEE/Sentinel-2" if ndvi_is_real else "Simulação (fixo 0.55)",
                    "mapbiomas_use": predominant_use,
                    "carbon_factor_tco2e_ha": round(carbon_factor_per_ha, 3),
                    "tco2e": total_carbon_sequestrated,
                    "usd_value_low": estimated_value_low,
                    "usd_value_mid": estimated_value_mid,
                    "usd_value_high": estimated_value_high,
                    "methodology": "IPCC Tier 1 + Embrapa Inventário Nacional GEE"
                }
            }
            try:
                logs_collection.insert_one(log_entry)
            except Exception as m_err:
                print(f"Erro ao salvar no MongoDB: {m_err}")

        # Retorna o Dashboard para o React
        return {
            "status": "success",
            "metrics": {
                "area_ha": round(area_hectares, 2),
                "ndvi_avg": ndvi_avg,
                "ndvi_source": "GEE/Sentinel-2 (Real)" if ndvi_is_real else "Simulação API",
                "land_use": predominant_use,
                "carbon_tco2e": total_carbon_sequestrated,
                "carbon_factor_tco2e_ha": round(carbon_factor_per_ha, 3),
                "methodology": "IPCC Tier 1 + Embrapa Inventário Nacional GEE",
                "market_value": {
                    "low_usd": estimated_value_low,
                    "mid_usd": estimated_value_mid,
                    "high_usd": estimated_value_high,
                    "note": "Faixa: sem certificação (low) até Verra/Gold Standard (high)"
                }
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)