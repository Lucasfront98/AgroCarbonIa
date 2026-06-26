"""
FastAPI router for the Rainfall Alert System.

Endpoints:
  POST /api/rainfall/assess                   - full risk assessment for a coordinate
  GET  /api/rainfall/forecast/{lat}/{lon}      - raw hourly forecast
  GET  /api/rainfall/historical-stats/{lat}/{lon} - historical climate statistics
  GET  /api/rainfall/locations                 - pre-configured monitored locations
"""
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

from .data_pipeline import (
    fetch_forecast_rainfall,
    fetch_historical_rainfall,
    compute_historical_stats,
)
from .risk_calculator import compute_risk_score
from .notifier import dispatch_alerts
from .models import LocationRequest

router = APIRouter(prefix="/api/rainfall", tags=["Rainfall Alert System"])

_hist_cache: dict = {}


@router.post("/assess", summary="Avalia o risco de chuva para uma localização")
async def assess_rainfall_risk(
    request: LocationRequest,
    notify: bool = Query(False, description="Disparar alertas se risco for Alto ou Crítico"),
) -> dict:
    """
    Fetches Open-Meteo forecast + historical archive, computes a multi-factor
    risk score, and optionally dispatches notifications.
    """
    cache_key = f"{request.latitude:.4f},{request.longitude:.4f}"

    try:
        if cache_key not in _hist_cache:
            hist_df = await fetch_historical_rainfall(
                request.latitude, request.longitude, years=5
            )
            _hist_cache[cache_key] = compute_historical_stats(hist_df)

        forecast_df = await fetch_forecast_rainfall(
            request.latitude,
            request.longitude,
            days=max(1, request.forecast_hours // 24 + 1),
        )

        risk = compute_risk_score(
            forecast_df, _hist_cache[cache_key], request.forecast_hours
        )

        notification_result: Optional[dict] = None
        if notify and risk["risk_level"] in ("Alto", "Crítico"):
            notification_result = await dispatch_alerts(
                risk, request.location_name, min_level="Alto"
            )

        return {
            "location_name":       request.location_name,
            "latitude":            request.latitude,
            "longitude":           request.longitude,
            "computed_at":         datetime.now().isoformat(),
            **risk,
            "notification_result": notification_result,
            "data_sources": {
                "forecast":      "Open-Meteo API (horária, até 16 dias)",
                "historical":    "Open-Meteo Archive API (ERA5, 5 anos)",
                "soil_moisture": "Open-Meteo ERA5 reanálise (0–7 cm)",
            },
        }

    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"Serviço meteorológico indisponível: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/locations", summary="Lista localizações monitoradas")
async def list_monitored_locations() -> dict:
    from .scheduler import MONITORED_LOCATIONS
    return {"locations": MONITORED_LOCATIONS}


@router.get("/forecast/{lat}/{lon}", summary="Previsão horária de chuva")
async def get_forecast(
    lat: float,
    lon: float,
    days: int = Query(3, ge=1, le=7),
) -> dict:
    try:
        df = await fetch_forecast_rainfall(lat, lon, days=days)
        df["time"] = df["time"].astype(str)
        return {"latitude": lat, "longitude": lon, "forecast_days": days, "data": df.to_dict("records")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/historical-stats/{lat}/{lon}", summary="Estatísticas históricas de chuva")
async def get_historical_stats(lat: float, lon: float) -> dict:
    try:
        hist_df = await fetch_historical_rainfall(lat, lon, years=5)
        stats   = compute_historical_stats(hist_df)
        return {"latitude": lat, "longitude": lon, "statistics": stats}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
