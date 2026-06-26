"""
Risk Score Calculator for the Rainfall Alert System.

Produces a composite score (0-100) and categorical level:
  Baixo / Medio / Alto / Critico

Scientific references:
  - INMET Portaria nº 14/2009 (rainfall intensity classes)
  - CEMADEN thresholds for landslide / flood triggering
  - ERA5 volumetric soil water content (m³/m³)
"""
from datetime import datetime
from enum import Enum
import pandas as pd

# Official INMET / CEMADEN thresholds
THRESHOLDS = {
    "heavy_rain_mm_day":      50.0,   # Chuva Forte (INMET)
    "very_heavy_rain_mm_day": 100.0,  # Chuva Muito Forte (INMET)
    "extreme_rain_mm_day":    150.0,  # Chuva Extrema (CEMADEN Nível 3)
    "critical_hourly_mm_h":    25.0,  # Intensidade crítica por hora
    "soil_saturation":          0.40, # m³/m³ (ERA5 limiar de saturação)
}


class RiskLevel(str, Enum):
    LOW      = "Baixo"
    MEDIUM   = "Médio"
    HIGH     = "Alto"
    CRITICAL = "Crítico"


def compute_risk_score(
    forecast_df: pd.DataFrame,
    historical_stats: dict,
    accumulation_window_hours: int = 24,
) -> dict:
    """
    Weighted composite score:
      intensity     25% - max mm/h vs critical threshold
      accumulation  45% - total mm vs INMET thresholds and historical P90/P95
      soil moisture 20% - ERA5 content vs saturation threshold
      anomaly       10% - ratio of forecast to historical monthly mean
    """
    now           = datetime.now()
    current_month = now.month

    window           = forecast_df.head(accumulation_window_hours)
    accumulated_mm   = float(window["precipitation_mm"].sum())
    max_intensity_mm = float(window["precipitation_mm"].max())
    avg_soil_moist   = float(window["soil_moisture"].mean()) if "soil_moisture" in window.columns else 0.0

    month_stats  = historical_stats.get("monthly", {}).get(current_month, {})
    monthly_mean = float(month_stats.get("mean_mm", 5.0))
    monthly_p90  = float(month_stats.get("p90_mm", 20.0))
    monthly_p95  = float(month_stats.get("p95_mm", 30.0))
    anomaly_ratio = accumulated_mm / max(monthly_mean, 1.0)

    intensity_score = min(100.0, (max_intensity_mm / THRESHOLDS["critical_hourly_mm_h"]) * 100)

    if accumulated_mm >= THRESHOLDS["extreme_rain_mm_day"]:
        accumulation_score = 100.0
    elif accumulated_mm >= THRESHOLDS["very_heavy_rain_mm_day"]:
        accumulation_score = 85.0
    elif accumulated_mm >= THRESHOLDS["heavy_rain_mm_day"]:
        accumulation_score = 65.0
    elif accumulated_mm >= monthly_p95:
        accumulation_score = 70.0
    elif accumulated_mm >= monthly_p90:
        accumulation_score = 50.0
    elif accumulated_mm >= monthly_mean * 2:
        accumulation_score = 35.0
    else:
        accumulation_score = min(30.0, (accumulated_mm / max(monthly_mean, 1.0)) * 15)

    saturation_score = min(100.0, (avg_soil_moist / THRESHOLDS["soil_saturation"]) * 80)
    anomaly_score    = min(100.0, max(0.0, (anomaly_ratio - 1.0) * 30))

    composite = round(min(100.0, max(0.0,
        intensity_score    * 0.25
        + accumulation_score * 0.45
        + saturation_score   * 0.20
        + anomaly_score      * 0.10
    )), 1)

    if composite >= 75:
        level = RiskLevel.CRITICAL
        color = "#FF0000"
    elif composite >= 50:
        level = RiskLevel.HIGH
        color = "#FF8C00"
    elif composite >= 25:
        level = RiskLevel.MEDIUM
        color = "#FFD700"
    else:
        level = RiskLevel.LOW
        color = "#32CD32"

    return {
        "risk_level":      level.value,
        "composite_score": composite,
        "alert_color":     color,
        "components": {
            "intensity_score":    round(intensity_score,    1),
            "accumulation_score": round(accumulation_score, 1),
            "saturation_score":   round(saturation_score,   1),
            "anomaly_score":      round(anomaly_score,      1),
        },
        "rainfall_metrics": {
            "accumulated_mm":          round(accumulated_mm,   2),
            "max_hourly_intensity_mm": round(max_intensity_mm, 2),
            "avg_soil_moisture":       round(avg_soil_moist,   3),
            "anomaly_ratio":           round(anomaly_ratio,    2),
        },
        "historical_reference": {
            "monthly_mean_mm": monthly_mean,
            "monthly_p90_mm":  monthly_p90,
            "monthly_p95_mm":  monthly_p95,
        },
        "thresholds_exceeded": _exceeded(accumulated_mm, max_intensity_mm, avg_soil_moist),
    }


def _exceeded(accumulated_mm: float, max_intensity_mm: float, soil_moisture: float) -> list:
    exceeded = []
    if accumulated_mm >= THRESHOLDS["extreme_rain_mm_day"]:
        exceeded.append({"threshold": "Chuva Extrema (CEMADEN/INMET)", "value": f"{accumulated_mm:.1f}mm ≥ 150mm"})
    elif accumulated_mm >= THRESHOLDS["very_heavy_rain_mm_day"]:
        exceeded.append({"threshold": "Chuva Muito Forte (INMET)", "value": f"{accumulated_mm:.1f}mm ≥ 100mm"})
    elif accumulated_mm >= THRESHOLDS["heavy_rain_mm_day"]:
        exceeded.append({"threshold": "Chuva Forte (INMET)", "value": f"{accumulated_mm:.1f}mm ≥ 50mm"})
    if max_intensity_mm >= THRESHOLDS["critical_hourly_mm_h"]:
        exceeded.append({"threshold": "Intensidade Horária Crítica", "value": f"{max_intensity_mm:.1f}mm/h ≥ 25mm/h"})
    if soil_moisture >= THRESHOLDS["soil_saturation"]:
        exceeded.append({"threshold": "Saturação do Solo (ERA5)", "value": f"{soil_moisture:.3f} m³/m³ ≥ 0.40"})
    return exceeded
