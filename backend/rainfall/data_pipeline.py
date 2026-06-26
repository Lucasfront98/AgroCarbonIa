"""
Data pipeline for the Rainfall Alert System.

APIs used:
  - Open-Meteo Forecast : https://api.open-meteo.com/v1/forecast
  - Open-Meteo Archive  : https://archive-api.open-meteo.com/v1/archive

For Brazilian institutional data (INMET BDMEP), a free API token is available at
https://apitempo.inmet.gov.br — integrate by replacing fetch_historical_rainfall
with calls to the /BDMEP/{station_id} endpoint and mapping the JSON to the same
DataFrame schema returned here.
"""
import httpx
import pandas as pd
from datetime import datetime, timedelta

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_ARCHIVE_URL  = "https://archive-api.open-meteo.com/v1/archive"


async def fetch_forecast_rainfall(lat: float, lon: float, days: int = 7) -> pd.DataFrame:
    """
    Returns hourly forecast DataFrame with columns:
      time, precipitation_mm, precipitation_prob, soil_moisture
    """
    params = {
        "latitude":  lat,
        "longitude": lon,
        "hourly": [
            "precipitation",
            "precipitation_probability",
            "soil_moisture_0_to_7cm",
        ],
        "forecast_days": min(days, 16),
        "timezone": "America/Sao_Paulo",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(OPEN_METEO_FORECAST_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    h = data["hourly"]
    df = pd.DataFrame({
        "time":              pd.to_datetime(h["time"]),
        "precipitation_mm":  h["precipitation"],
        "precipitation_prob": h["precipitation_probability"],
        "soil_moisture":     h["soil_moisture_0_to_7cm"],
    })
    df["precipitation_mm"] = df["precipitation_mm"].fillna(0.0)
    df["soil_moisture"]    = df["soil_moisture"].fillna(0.0)
    return df


async def fetch_historical_rainfall(lat: float, lon: float, years: int = 5) -> pd.DataFrame:
    """
    Returns daily archive DataFrame with columns:
      date, precipitation_mm, month, week_of_year

    The archive has a ~5-day lag; end_date is adjusted accordingly.
    """
    end_date   = datetime.now() - timedelta(days=7)
    start_date = end_date - timedelta(days=365 * years)

    params = {
        "latitude":   lat,
        "longitude":  lon,
        "daily":      "precipitation_sum",
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date":   end_date.strftime("%Y-%m-%d"),
        "timezone":   "America/Sao_Paulo",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(OPEN_METEO_ARCHIVE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    df = pd.DataFrame({
        "date":             pd.to_datetime(data["daily"]["time"]),
        "precipitation_mm": data["daily"]["precipitation_sum"],
    })
    df["precipitation_mm"] = df["precipitation_mm"].fillna(0.0)
    df["month"]            = df["date"].dt.month
    df["week_of_year"]     = df["date"].dt.isocalendar().week.astype(int)
    return df


def compute_historical_stats(historical_df: pd.DataFrame) -> dict:
    """
    Computes per-month and per-week statistics used to define the
    'normal' rainfall baseline and anomaly thresholds.

    Keys in each month/week dict:
      mean_mm, std_mm, p75_mm, p90_mm, p95_mm
    """
    monthly_stats: dict = {}
    for month in range(1, 13):
        data = historical_df[historical_df["month"] == month]["precipitation_mm"].dropna()
        if data.empty:
            continue
        monthly_stats[month] = {
            "mean_mm": round(float(data.mean()), 2),
            "std_mm":  round(float(data.std()),  2),
            "p75_mm":  round(float(data.quantile(0.75)), 2),
            "p90_mm":  round(float(data.quantile(0.90)), 2),
            "p95_mm":  round(float(data.quantile(0.95)), 2),
        }

    weekly_stats: dict = {}
    for week in sorted(historical_df["week_of_year"].unique()):
        data = historical_df[historical_df["week_of_year"] == week]["precipitation_mm"].dropna()
        if data.empty:
            continue
        weekly_stats[int(week)] = {
            "mean_mm": round(float(data.mean()), 2),
            "std_mm":  round(float(data.std()),  2),
            "p90_mm":  round(float(data.quantile(0.90)), 2),
            "p95_mm":  round(float(data.quantile(0.95)), 2),
        }

    return {"monthly": monthly_stats, "weekly": weekly_stats}
