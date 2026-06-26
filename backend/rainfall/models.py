from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, Float, String, DateTime, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class RainfallAlertRecord(Base):
    __tablename__ = "rainfall_alerts"

    id = Column(Integer, primary_key=True, index=True)
    location_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    computed_at = Column(DateTime, default=datetime.utcnow)
    risk_level = Column(String, nullable=False)
    composite_score = Column(Float, nullable=False)
    accumulated_rain_mm = Column(Float)
    max_intensity_mm_h = Column(Float)
    avg_soil_moisture = Column(Float)
    thresholds_exceeded = Column(JSON, default=list)


class LocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude em graus decimais")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude em graus decimais")
    location_name: str = Field(default="Localização", description="Nome legível da localização")
    forecast_hours: int = Field(default=24, ge=1, le=168, description="Janela de previsão em horas")


class RiskComponent(BaseModel):
    intensity_score: float
    accumulation_score: float
    saturation_score: float
    anomaly_score: float


class RainfallMetrics(BaseModel):
    accumulated_mm: float
    max_hourly_intensity_mm: float
    avg_soil_moisture: float
    anomaly_ratio: float


class HistoricalReference(BaseModel):
    monthly_mean_mm: float
    monthly_p90_mm: float
    monthly_p95_mm: float


class RiskAssessmentResponse(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    computed_at: datetime
    risk_level: str
    composite_score: float
    alert_color: str
    components: RiskComponent
    rainfall_metrics: RainfallMetrics
    historical_reference: HistoricalReference
    thresholds_exceeded: List[dict]
    notification_result: Optional[dict] = None
