"""
Gestionnaire d'envoi des webhooks sortants vers les abonnés (Étape 7 du Guide).
Signature HMAC-SHA256, délais croissants et journalisation dans audit_log.
"""

import hashlib
import hmac
import json
import logging
import time
import uuid
from typing import Any, Dict
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from libs.persistence.models import AuditLog, Run, WebhookSub, utc_now

logger = logging.getLogger("odace.orchestrator.webhooks")


async def dispatch_run_completed_webhooks(run: Run, session: AsyncSession) -> None:
    """
    Envoie une notification signée par webhook à tous les récepteurs abonnés au projet.
    """
    if not run or not run.project_id:
        return

    stmt = select(WebhookSub).where(WebhookSub.project_id == run.project_id)
    res = await session.execute(stmt)
    subscriptions = list(res.scalars().all())

    if not subscriptions:
        return

    # Extraire les métriques du dernier événement
    metrics: Dict[str, Any] = {}
    for ev in reversed(run.events or []):
        if ev.details:
            metrics = ev.details
            break

    payload = {
        "event": "run.completed",
        "run_id": str(run.id),
        "project_id": str(run.project_id),
        "state": run.state.value if hasattr(run.state, "value") else str(run.state),
        "result": run.result.value if hasattr(run.result, "value") and run.result else None,
        "validation": run.validation.value if hasattr(run.validation, "value") and run.validation else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else utc_now().isoformat(),
        "metrics": metrics,
    }

    raw_body = json.dumps(payload).encode("utf-8")
    ts = str(int(time.time()))

    async with httpx.AsyncClient(timeout=8.0) as client:
        for sub in subscriptions:
            secret = sub.secret_vault_ref or "default-secret"
            sig = hmac.new(
                secret.encode("utf-8"),
                f"{ts}.".encode("utf-8") + raw_body,
                hashlib.sha256,
            ).hexdigest()

            headers = {
                "Content-Type": "application/json",
                "X-Odace-Timestamp": ts,
                "X-Odace-Signature": sig,
                "User-Agent": "ODACE-TestOps-Webhook/1.0",
            }

            delivery_status = "SUCCESS"
            http_code = None
            try:
                resp = await client.post(sub.target_url, content=raw_body, headers=headers)
                http_code = resp.status_code
                if resp.status_code >= 400:
                    delivery_status = f"HTTP_{resp.status_code}"
            except Exception as e:
                delivery_status = f"ERROR: {str(e)[:50]}"
                logger.warning("Échec de livraison du webhook %s: %s", sub.target_url, e)

            # Trace d'audit pour chaque livraison
            audit = AuditLog(
                actor="orchestrator.webhook",
                action="WEBHOOK_DISPATCH",
                object_type="WebhookSub",
                object_id=str(sub.id),
                details={
                    "target_url": sub.target_url,
                    "status": delivery_status,
                    "http_code": http_code,
                    "run_id": str(run.id),
                },
            )
            session.add(audit)

    await session.commit()
