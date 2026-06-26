"""
Notification module for the Rainfall Alert System.
Supports Telegram Bot, generic Webhook POST, and SMTP email.

Environment variables (all optional; channel skipped if absent):
  Telegram : TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
  Webhook  : ALERT_WEBHOOK_URL
  Email    : SMTP_HOST, SMTP_PORT (default 587), SMTP_USER,
             SMTP_PASS, ALERT_EMAIL_RECIPIENTS (comma-separated)
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

TELEGRAM_BOT_TOKEN     = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID       = os.getenv("TELEGRAM_CHAT_ID", "")
ALERT_WEBHOOK_URL      = os.getenv("ALERT_WEBHOOK_URL", "")
SMTP_HOST              = os.getenv("SMTP_HOST", "")
SMTP_PORT              = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER              = os.getenv("SMTP_USER", "")
SMTP_PASS              = os.getenv("SMTP_PASS", "")
ALERT_EMAIL_RECIPIENTS = os.getenv("ALERT_EMAIL_RECIPIENTS", "")

_EMOJI = {"Crítico": "🚨", "Alto": "⚠️", "Médio": "🟡", "Baixo": "✅"}
_COLOR = {"Crítico": "#FF0000", "Alto": "#FF8C00", "Médio": "#FFD700", "Baixo": "#32CD32"}
_LEVELS = ["Baixo", "Médio", "Alto", "Crítico"]


async def _send_telegram(risk: dict, location: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False

    level    = risk["risk_level"]
    exceeded = risk.get("thresholds_exceeded", [])
    exceeded_text = (
        "\n".join(f"  • {t['threshold']}: {t['value']}" for t in exceeded)
        if exceeded else "  Nenhum"
    )
    msg = (
        f"{_EMOJI.get(level, '⚠️')} *ALERTA DE CHUVA — {location.upper()}*\n\n"
        f"*Nível de Risco:* {level} ({risk['composite_score']}/100)\n"
        f"*Chuva acumulada:* {risk['rainfall_metrics']['accumulated_mm']}mm\n"
        f"*Intensidade máxima:* {risk['rainfall_metrics']['max_hourly_intensity_mm']}mm/h\n"
        f"*Umidade do solo:* {risk['rainfall_metrics']['avg_soil_moisture']:.1%}\n\n"
        f"*Limites ultrapassados:*\n{exceeded_text}"
    )

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            url, json={"chat_id": TELEGRAM_CHAT_ID, "text": msg, "parse_mode": "Markdown"}
        )
    return resp.status_code == 200


async def _send_webhook(risk: dict, location: str) -> bool:
    if not ALERT_WEBHOOK_URL:
        return False

    payload = {
        "event":               "rainfall_alert",
        "location":            location,
        "risk_level":          risk["risk_level"],
        "composite_score":     risk["composite_score"],
        "rainfall_metrics":    risk["rainfall_metrics"],
        "thresholds_exceeded": risk.get("thresholds_exceeded", []),
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(ALERT_WEBHOOK_URL, json=payload)
    return resp.status_code < 400


def _send_email(risk: dict, location: str) -> bool:
    if not all([SMTP_HOST, SMTP_USER, ALERT_EMAIL_RECIPIENTS]):
        return False

    recipients = [r.strip() for r in ALERT_EMAIL_RECIPIENTS.split(",") if r.strip()]
    level = risk["risk_level"]
    color = _COLOR.get(level, "#FF8C00")

    rows = "".join(
        f"<tr><td>{t['threshold']}</td><td><strong>{t['value']}</strong></td></tr>"
        for t in risk.get("thresholds_exceeded", [])
    ) or "<tr><td colspan='2'>Nenhum limiar ultrapassado</td></tr>"

    html = (
        f"<html><body style='font-family:Arial,sans-serif;color:#333;'>"
        f"<div style='max-width:600px;margin:auto;border-top:6px solid {color};padding:20px;'>"
        f"<h2 style='color:{color};'>{_EMOJI.get(level,'')} Alerta de Chuva — {location}</h2>"
        f"<table cellpadding='8' style='border-collapse:collapse;width:100%;'>"
        f"<tr><td>Nível de Risco</td><td><strong>{level} ({risk['composite_score']}/100)</strong></td></tr>"
        f"<tr><td>Chuva acumulada</td><td>{risk['rainfall_metrics']['accumulated_mm']} mm</td></tr>"
        f"<tr><td>Intensidade máxima</td><td>{risk['rainfall_metrics']['max_hourly_intensity_mm']} mm/h</td></tr>"
        f"<tr><td>Umidade do solo</td><td>{risk['rainfall_metrics']['avg_soil_moisture']:.1%}</td></tr>"
        f"</table><h3>Limites Ultrapassados</h3>"
        f"<table cellpadding='8' style='border-collapse:collapse;width:100%;border:1px solid #ddd;'>{rows}</table>"
        f"<p style='color:#888;font-size:11px;margin-top:20px;'>Emitido automaticamente pelo Sistema de Alerta — AgroCarbon IA</p>"
        f"</div></body></html>"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[{level}] Alerta de Risco de Chuva — {location}"
    msg["From"]    = SMTP_USER
    msg["To"]      = ", ".join(recipients)
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as srv:
            srv.starttls()
            srv.login(SMTP_USER, SMTP_PASS)
            srv.sendmail(SMTP_USER, recipients, msg.as_string())
        return True
    except Exception as exc:
        print(f"[Notifier] Email falhou: {exc}")
        return False


async def dispatch_alerts(risk: dict, location: str, min_level: str = "Alto") -> dict:
    """
    Dispatches alerts through all configured channels when risk >= min_level.
    """
    current_idx = _LEVELS.index(risk.get("risk_level", "Baixo"))
    min_idx     = _LEVELS.index(min_level)

    if current_idx < min_idx:
        return {"dispatched": False, "reason": f"Risco abaixo do mínimo configurado ({min_level})"}

    results = {
        "telegram": await _send_telegram(risk, location),
        "webhook":  await _send_webhook(risk, location),
        "email":    _send_email(risk, location),
    }
    return {"dispatched": True, "channels": results}
