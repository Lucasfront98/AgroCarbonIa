import os
import json
import time
import random
import tempfile
import asyncio
import httpx
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from datetime import datetime
from typing import Dict, Any, Optional

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
# 1. Autenticação Google Earth Engine via Service Account
# ==========================================================
GEE_PROJECT_ID = os.getenv("GEE_PROJECT_ID", "")
GEE_SERVICE_ACCOUNT_JSON = os.getenv("GEE_SERVICE_ACCOUNT_JSON", "")

gee_initialized = False

def initialize_gee() -> bool:
    """
    Autentica no GEE usando a Service Account configurada em variável de ambiente.
    Retorna True se bem-sucedido, False caso contrário.
    """
    global gee_initialized

    if gee_initialized:
        return True

    if not GEE_SERVICE_ACCOUNT_JSON or not GEE_PROJECT_ID:
        print("Aviso: GEE_PROJECT_ID ou GEE_SERVICE_ACCOUNT_JSON não configurados. Usando simulação.")
        return False

    try:
        # Faz parse do JSON da Service Account
        sa_info = json.loads(GEE_SERVICE_ACCOUNT_JSON)
        service_account_email = sa_info.get("client_email", "")

        if not service_account_email:
            print("Aviso: JSON da Service Account não contém 'client_email'.")
            return False

        # Escreve o JSON em arquivo temporário (exigido pela SDK do GEE)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp:
            json.dump(sa_info, tmp)
            tmp_path = tmp.name

        credentials = ee.ServiceAccountCredentials(
            email=service_account_email,
            key_file=tmp_path
        )
        ee.Initialize(credentials=credentials, project=GEE_PROJECT_ID)
        os.unlink(tmp_path)  # apaga o arquivo temporário imediatamente

        gee_initialized = True
        print(f"Earth Engine autenticado com sucesso! Conta: {service_account_email}")
        return True

    except Exception as e:
        print(f"Erro ao autenticar no Earth Engine: {e}")
        return False


# ==========================================================
# 2. Configurações de Bancos de Dados
# ==========================================================
PG_URL = os.getenv("DATABASE_URL", "")
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
    print("Aviso: PostgreSQL URL local ou ausente. Modo Fallback ativado.")

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

    # Tenta autenticar no GEE já no startup para detectar erros de configuração cedo
    initialize_gee()
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


# ==========================================================
# 3. Rotas auxiliares
# ==========================================================
@app.get("/")
def read_root():
    return {
        "status": "AgroCarbon IA API no ar!",
        "version": "v2.2.0-gee-integrated",
        "gee_status": "autenticado" if gee_initialized else "simulação"
    }


# ==========================================================
# 4. Modelos Pydantic (Entradas da API)
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
# 5. Integração SoilGrids (COS real via REST)
# Documentação: https://rest.isric.org/soilgrids/v2.0/docs
# Retorna Carbono Orgânico do Solo (SOC) em g/kg para a
# camada 0-30cm (horizonte de sequestro agrícola relevante).
# ==========================================================
async def fetch_soilgrids_soc(lat: float, lon: float) -> Optional[float]:
    """
    Busca SOC (Carbono Orgânico do Solo) do SoilGrids para um ponto central.
    Retorna valor em g/kg ou None se indisponível.
    """
    url = (
        f"https://rest.isric.org/soilgrids/v2.0/properties/query"
        f"?lon={lon}&lat={lat}"
        f"&property=soc&depth=0-30cm&value=mean"
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

            # Navega no JSON aninhado do SoilGrids
            layers = data.get("properties", {}).get("layers", [])
            for layer in layers:
                if layer.get("name") == "soc":
                    depths = layer.get("depths", [])
                    for depth in depths:
                        if depth.get("label") == "0-30cm":
                            soc_raw = depth.get("values", {}).get("mean")
                            if soc_raw is not None:
                                # SoilGrids retorna em dg/kg × 10, converter para g/kg
                                return round(soc_raw / 10.0, 2)
    except Exception as e:
        print(f"SoilGrids indisponível: {e}")
    return None


# ==========================================================
# 6. Rotas da API e Lógica Matemática (MRV)
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
    if "-" not in car_number:
        raise HTTPException(status_code=400, detail="Formato de CAR inválido. Ex: SP-3555000-ABCD...")
    state_code = car_number[:2].upper()
    valid_states = [
        "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
        "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
    ]
    if state_code not in valid_states:
        raise HTTPException(status_code=400, detail=f"Sigla de estado inválida: {state_code}")
    try:
        layer_name = f"sicar:sicar_imoveis_{state_code.lower()}"
        geoserver_url = "https://geoserver.car.gov.br/geoserver/sicar/wfs"
        car_clean = car_number.strip().upper()

        def _sync_sicar(url, p):
            r = requests.get(url, params=p, verify=False, timeout=45)
            r.raise_for_status()
            return r.json()

        # O GeoServer pode estar lento/instável e o campo cod_imovel pode estar
        # em caixa diferente da digitada — tenta algumas variações com retry
        # antes de cair no fallback simulado.
        attempts = [
            f"cod_imovel='{car_clean}'",
            f"cod_imovel='{car_number.strip()}'",
            f"UPPER(cod_imovel)='{car_clean}'",
        ]

        data = None
        last_error = None
        for attempt_idx, cql in enumerate(attempts, start=1):
            params = {
                "service": "WFS",
                "version": "2.0.0",
                "request": "GetFeature",
                "typeName": layer_name,
                "outputFormat": "application/json",
                "CQL_FILTER": cql,
                "maxFeatures": "1"
            }
            for retry in range(2):
                try:
                    candidate = await asyncio.to_thread(_sync_sicar, geoserver_url, params)
                    candidate_features = candidate.get("features", [])
                    print(f"SICAR (tentativa {attempt_idx}, retry {retry}): {len(candidate_features)} feature(s) para {car_number} com filtro [{cql}]")
                    if candidate_features:
                        data = candidate
                        break
                    elif data is None:
                        data = candidate  # guarda última resposta válida (mesmo vazia) para diagnóstico
                except Exception as e:
                    last_error = e
                    print(f"SICAR (tentativa {attempt_idx}, retry {retry}) falhou: {e}")
            if data and data.get("features"):
                break

        if last_error and not (data and data.get("features")):
            print(f"GeoServer SICAR: todas as tentativas falharam ou vieram vazias. Último erro: {last_error}")

        features = (data or {}).get("features", [])
        print(f"SICAR: resultado final — {len(features)} feature(s) encontrada(s) para {car_number}")
        if features and len(features) > 0:
                feature = features[0]
                geometry = feature.get("geometry", {})
                properties = feature.get("properties", {})
                clean_feature = {
                    "type": "Feature",
                    "properties": {
                        "registro_oficial": car_number.upper(),
                        "origem": "SICAR_GeoServer_Oficial",
                        "status": properties.get("ind_status", "Consultado"),
                        "area_ha": properties.get("num_area", None),
                        "municipio": properties.get("nom_municipio", None),
                        "estado": state_code,
                        "tipo_imovel": properties.get("ind_tipo", None),
                        "dados_reais": True
                    },
                    "geometry": geometry
                }
                print(f"CAR real encontrado: {car_number}")
                return {
                    "status": "success",
                    "source": "SICAR GeoServer Oficial",
                    "dados_reais": True,
                    "geojson": {
                        "type": "FeatureCollection",
                        "features": [clean_feature]
                    }
                }
    except Exception as e:
        print(f"GeoServer indisponível: {e}")

    # FALLBACK mock — gera o polígono perto do centróide aproximado do
    # ESTADO indicado no número do CAR, para a localização não cair em
    # outra região do país quando o GeoServer estiver indisponível.
    state_centroids = {
        "AC": (-9.0, -70.0), "AL": (-9.6, -36.3), "AM": (-4.0, -63.0), "AP": (1.4, -51.9),
        "BA": (-12.5, -41.7), "CE": (-5.2, -39.5), "DF": (-15.8, -47.9), "ES": (-19.2, -40.4),
        "GO": (-15.9, -49.6), "MA": (-5.0, -45.3), "MG": (-18.6, -44.4), "MS": (-20.5, -54.6),
        "MT": (-12.6, -55.7), "PA": (-3.9, -52.5), "PB": (-7.2, -36.7), "PE": (-8.5, -37.5),
        "PI": (-7.5, -42.8), "PR": (-24.7, -51.5), "RJ": (-22.3, -43.0), "RN": (-5.8, -36.6),
        "RO": (-10.9, -62.8), "RR": (2.0, -61.4), "RS": (-30.0, -53.2), "SC": (-27.3, -50.0),
        "SE": (-10.6, -37.4), "SP": (-22.2, -48.6), "TO": (-10.2, -48.3)
    }
    centroid_lat, centroid_lng = state_centroids.get(state_code, (-12.56, -55.72))
    base_lng = round(centroid_lng + random.uniform(-0.6, 0.6), 4)
    base_lat = round(centroid_lat + random.uniform(-0.6, 0.6), 4)
    offset_lat = random.uniform(0.02, 0.08)
    offset_lng = random.uniform(0.02, 0.08)
    feature = {
        "type": "Feature",
        "properties": {
            "registro_oficial": car_number.upper(),
            "origem": "Mock_Fallback",
            "status": "Simulação",
            "estado": state_code,
            "dados_reais": False
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
        "source": "Mock (fallback)",
        "dados_reais": False,
        "geojson": {
            "type": "FeatureCollection",
            "features": [feature]
        }
    }


@app.post("/api/analyze-farm")
async def analyze_farm(payload: GeoJSONPayload):
    """
    Recebe um GeoJSON do Frontend, extrai o polígono, calcula área e estimativas de carbono.

    Fontes científicas:
    - Área: pyproj Geod WGS84 (geodésico real)
    - NDVI: Sentinel-2 SR via GEE (banda B8/B4, 10m, mediana anual 2024) | fallback: 0.55
    - Uso do solo: MapBiomas Coleção 8.0 via GEE | fallback: aleatório ponderado
    - COS: SoilGrids v2.0 REST API (0-30cm) | fallback: não aplicado
    - Fatores de carbono: IPCC Tier 1 (2006 GL) + Embrapa Inventário Nacional GEE
    - Preço: Ecosystem Marketplace 2024, Moss.Earth MCO2, CBIO B3
    """
    try:
        if not payload.features:
            raise HTTPException(status_code=400, detail="Nenhum polígono encontrado.")

        geom_dict = payload.features[0]['geometry']
        polygon = shape(geom_dict)

        # ===============================================================
        # CÁLCULO DE ÁREA (Elipsoide WGS84 — geodésico real)
        # ===============================================================
        geod = pyproj.Geod(ellps="WGS84")
        area_sq_meters, _ = geod.geometry_area_perimeter(polygon)
        area_hectares = abs(area_sq_meters) / 10000.0

        if area_hectares <= 0.01:
            raise HTTPException(status_code=400, detail="Área desenhada é pequena demais.")

        # ===============================================================
        # PONTO CENTRAL para consultas de ponto (SoilGrids)
        # ===============================================================
        centroid = polygon.centroid
        center_lat = centroid.y
        center_lon = centroid.x

        # ===============================================================
        # NDVI e USO DO SOLO — GEE (real) ou Fallback (simulação)
        # ===============================================================
        ndvi_is_real = False
        ndvi_avg = 0.55  # fallback conservador (Embrapa: média BR agrícola)
        predominant_use = None
        mapbiomas_class_id = None

        # Tenta inicializar o GEE a cada requisição (idempotente se já inicializado)
        gee_available = initialize_gee()

        if gee_available:
            try:
                coords = payload.features[0]["geometry"]["coordinates"]
                ee_geom = ee.Geometry.Polygon(coords)

                # --- NDVI real via Sentinel-2 ---
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

                # --- Uso do solo via MapBiomas (Coleção pública oficial no GEE) ---
                # Asset correto e atualmente mantido pela MapBiomas no catálogo público do GEE:
                # https://developers.google.com/earth-engine/datasets/catalog/projects_mapbiomas-public_assets_brazil_lulc_v1
                # É uma ImageCollection com 1 imagem por (ano, coleção); cada imagem tem a banda "classification".
                mapbiomas_collection = ee.ImageCollection('projects/mapbiomas-public/assets/brazil/lulc/v1')
                latest_year = ee.Number(mapbiomas_collection.aggregate_max('year'))
                latest_collection_id = ee.Number(mapbiomas_collection.aggregate_max('collection_id'))
                mapbiomas_latest = mapbiomas_collection.filter(
                    ee.Filter.And(
                        ee.Filter.eq('year', latest_year),
                        ee.Filter.eq('collection_id', latest_collection_id)
                    )
                ).first()

                band_name = 'classification'
                stats = mapbiomas_latest.select(band_name).reduceRegion(
                    reducer=ee.Reducer.mode(),
                    geometry=ee_geom,
                    scale=30,
                    maxPixels=1e9
                ).getInfo()

                mapbiomas_class_id = stats.get(band_name)

                # Mapeamento de classes MapBiomas → uso dominante
                # https://mapbiomas.org/codigos-de-legenda
                if mapbiomas_class_id == 15:
                    predominant_use = "Pastagem Bem Manejada"
                elif mapbiomas_class_id in [39, 41, 19, 20, 21]:
                    predominant_use = "Agricultura (Plantio Direto)"
                elif mapbiomas_class_id == 3:
                    predominant_use = "Reserva Legal (Floresta Intacta)"
                elif mapbiomas_class_id in [9, 36]:
                    predominant_use = "Integração Lavoura-Pecuária-Floresta (ILPF)"
                else:
                    predominant_use = "Integração Lavoura-Pecuária-Floresta (ILPF)"

            except Exception as e:
                print(f"GEE falhou durante análise. Fallback ativado. Erro: {e}")
                gee_available = False

        # Fallback de uso do solo se GEE não disponível
        if not predominant_use:
            land_uses = [
                "Pastagem Bem Manejada",
                "Agricultura (Plantio Direto)",
                "Integração Lavoura-Pecuária-Floresta (ILPF)"
            ]
            predominant_use = random.choice(land_uses)

        # ===============================================================
        # COS — SoilGrids (carbono orgânico do solo, 0-30cm)
        # Complementa o sequestro aéreo/biomassa com estoque edáfico.
        # Referência: ISRIC SoilGrids v2.0 (Poggio et al., 2021)
        # ===============================================================
        soc_g_per_kg = await fetch_soilgrids_soc(center_lat, center_lon)
        soc_is_real = soc_g_per_kg is not None

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
        # ===============================================================
        carbon_factors = {
            "Integração Lavoura-Pecuária-Floresta (ILPF)": 12.0,
            "Pastagem Bem Manejada": 5.0,
            "Agricultura (Plantio Direto)": 3.5,
            "Reserva Legal (Floresta Intacta)": 18.0,
        }
        base_factor = carbon_factors.get(predominant_use, 5.0)

        # Ajuste pelo NDVI: normalizado em torno de 0.55 (média BR)
        # Limita o multiplicador entre 0.7x e 1.3x
        ndvi_multiplier = max(0.7, min(1.3, ndvi_avg / 0.55))
        carbon_factor_per_ha = base_factor * ndvi_multiplier
        total_carbon_sequestrated = round(area_hectares * carbon_factor_per_ha, 2)

        # Bônus de COS: se o SoilGrids retornou valor real,
        # adiciona estimativa de estoque edáfico (conservadora: 10% do SOC como adicional)
        soc_bonus_tco2e = 0.0
        if soc_is_real and soc_g_per_kg:
            # Conversão: SOC (g/kg) × densidade do solo (1.3 t/m³) × profundidade (0.3m)
            # × área (ha) × fator CO2e (44/12) — simplificado para triagem Tier 1
            bulk_density = 1.3  # t/m³ (média Cerrado, Embrapa)
            depth_m = 0.3
            soc_fraction = soc_g_per_kg / 1000.0  # g/kg → kg/kg
            soc_t_per_ha = soc_fraction * bulk_density * depth_m * 10000  # ha → m²
            soc_co2e_per_ha = soc_t_per_ha * (44 / 12)
            # Bônus conservador: 5% do estoque como sequestro incremental possível
            soc_bonus_tco2e = round(area_hectares * soc_co2e_per_ha * 0.05, 2)
            total_carbon_sequestrated = round(total_carbon_sequestrated + soc_bonus_tco2e, 2)

        # ===============================================================
        # PREÇO DE MERCADO CALIBRADO
        # Fonte: Moss.Earth MCO2, CBIO B3, Ecosystem Marketplace 2024
        #
        # Mercado voluntário BR sem certificação:  US$ 5-10/tCO2e
        # Com certificação Verra VCS:             US$ 12-20/tCO2e
        # CBIO (mercado regulado, biocombustíveis): R$ 30-50/crédito
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
                print(f"PostGIS fallback ativado. {pg_err}")
                db.rollback()
            finally:
                db.close()

        # SALVAR NO MONGODB (Log Auditável)
        if logs_collection is not None:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "algo_version": "v2.2.0-gee-integrated",
                "feature": payload.features[0],
                "satellite_metadata": {
                    "ndvi_source": "GEE/Sentinel-2" if ndvi_is_real else "Simulação (fixo 0.55)",
                    "ndvi_is_real": ndvi_is_real,
                    "resolution_m": 10 if ndvi_is_real else None,
                    "mapbiomas_class_id": mapbiomas_class_id,
                    "soilgrids_soc_g_per_kg": soc_g_per_kg,
                    "soilgrids_is_real": soc_is_real,
                },
                "results": {
                    "area_ha": area_hectares,
                    "ndvi": ndvi_avg,
                    "mapbiomas_use": predominant_use,
                    "carbon_factor_tco2e_ha": round(carbon_factor_per_ha, 3),
                    "soc_bonus_tco2e": soc_bonus_tco2e,
                    "tco2e": total_carbon_sequestrated,
                    "usd_value_low": estimated_value_low,
                    "usd_value_mid": estimated_value_mid,
                    "usd_value_high": estimated_value_high,
                    "methodology": "IPCC Tier 1 + Embrapa Inventário Nacional GEE + SoilGrids v2.0"
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
                "ndvi_is_real": ndvi_is_real,
                "land_use": predominant_use,
                "mapbiomas_class_id": mapbiomas_class_id,
                "carbon_tco2e": total_carbon_sequestrated,
                "carbon_factor_tco2e_ha": round(carbon_factor_per_ha, 3),
                "soc_data": {
                    "soc_g_per_kg": soc_g_per_kg,
                    "is_real": soc_is_real,
                    "bonus_tco2e": soc_bonus_tco2e,
                    "source": "SoilGrids v2.0 (ISRIC)" if soc_is_real else "Não disponível"
                },
                "methodology": "IPCC Tier 1 + Embrapa Inventário Nacional GEE + SoilGrids v2.0",
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
