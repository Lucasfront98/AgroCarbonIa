"""
APScheduler configuration for the Rainfall Alert System.

Jobs:
  rainfall_check      (every 1 h)  - fetch forecast, compute risk, dispatch alerts
  historical_refresh  (every 24 h) - rebuild historical statistics cache

Uses AsyncIOScheduler so it shares the FastAPI / uvicorn event loop.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.memory import MemoryJobStore

from .data_pipeline import (
    fetch_forecast_rainfall,
    fetch_historical_rainfall,
    compute_historical_stats,
)
from .risk_calculator import compute_risk_score
from .notifier import dispatch_alerts

scheduler = AsyncIOScheduler(
    jobstores={"default": MemoryJobStore()},
    job_defaults={"coalesce": False, "max_instances": 1},
    timezone="America/Sao_Paulo",
)

# High-risk Brazilian regions pre-configured for monitoring.
# Extend via the /api/rainfall/locations endpoint or a DB table.
MONITORED_LOCATIONS = [
    {"name": "Região Serrana do Rio de Janeiro", "lat": -22.50, "lon": -43.19},
    {"name": "Petrópolis — RJ",                  "lat": -22.51, "lon": -43.18},
    {"name": "Grande São Paulo — SP",             "lat": -23.55, "lon": -46.63},
    {"name": "Vale do Itajaí — SC",               "lat": -26.91, "lon": -49.07},
    {"name": "Recife — PE",                        "lat": -8.05,  "lon": -34.88},
]

_hist_cache: dict = {}


async def _refresh_historical_stats() -> None:
    for loc in MONITORED_LOCATIONS:
        key = f"{loc['lat']},{loc['lon']}"
        try:
            hist_df = await fetch_historical_rainfall(loc["lat"], loc["lon"], years=5)
            _hist_cache[key] = compute_historical_stats(hist_df)
            print(f"[Scheduler] Stats históricas atualizadas: {loc['name']}", flush=True)
        except Exception as exc:
            print(f"[Scheduler] Erro ao atualizar stats ({loc['name']}): {exc}", flush=True)


async def _run_rainfall_check() -> None:
    for loc in MONITORED_LOCATIONS:
        key = f"{loc['lat']},{loc['lon']}"
        try:
            if key not in _hist_cache:
                hist_df = await fetch_historical_rainfall(loc["lat"], loc["lon"], years=5)
                _hist_cache[key] = compute_historical_stats(hist_df)

            forecast_df = await fetch_forecast_rainfall(loc["lat"], loc["lon"], days=2)
            risk        = compute_risk_score(forecast_df, _hist_cache[key])

            print(
                f"[Scheduler] {loc['name']} — "
                f"Risco: {risk['risk_level']} ({risk['composite_score']}/100)",
                flush=True,
            )

            if risk["risk_level"] in ("Alto", "Crítico"):
                await dispatch_alerts(risk, loc["name"], min_level="Alto")

        except Exception as exc:
            print(f"[Scheduler] Erro ao verificar {loc['name']}: {exc}", flush=True)


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(_run_rainfall_check,       "interval", hours=1,  id="rainfall_check")
    scheduler.add_job(_refresh_historical_stats,  "interval", hours=24, id="historical_refresh")
    scheduler.start()
    print("[Scheduler] Iniciado — checagem de chuvas a cada 1h, refresh histórico a cada 24h.", flush=True)


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[Scheduler] Encerrado.", flush=True)
