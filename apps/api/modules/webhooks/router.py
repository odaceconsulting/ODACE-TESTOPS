"""
Module de gestion des Webhooks entrants et sortants (Étape 7 du Guide Développeur).
Sécurité HMAC-SHA256, protection anti-rejeu et traçabilité immuable dans audit_log.
"""

import hashlib
import hmac
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from apps.api.core.authentication import CurrentUser
from apps.api.core.authorization import require_role
from apps.api.core.errors import APIError
from apps.api.modules.runs.service import RunService
from apps.orchestrator.execution import execute_run_task
from libs.contracts.runs import RunCreateRequest
from libs.domain.enums import UserRole
from libs.persistence.database import get_db_session
from libs.persistence.models import AuditLog, Project, Target, TestAsset, WebhookSub, utc_now

logger = logging.getLogger("odace.webhooks")

router = APIRouter(prefix="/webhooks", tags=["Webhooks CI/CD"])


class WebhookIncomingPayload(BaseModel):
    """Payload transmis par un pipeline CI/CD (GitHub Actions, GitLab CI, etc.)."""
    asset_id: Optional[uuid.UUID] = None
    asset_name: Optional[str] = None
    target_id: Optional[uuid.UUID] = None
    target_name: Optional[str] = None
    threads: int = Field(default=50, ge=1)
    duration_sec: int = Field(default=60, ge=10)
    public_params: Dict[str, Any] = Field(default_factory=dict)


class WebhookSubscriptionRequest(BaseModel):
    project_id: uuid.UUID
    target_url: str
    secret: str = Field(..., min_length=16, description="Clé secrète partagée pour la signature HMAC")
    events: List[str] = Field(default_factory=lambda: ["run.completed"])


class WebhookSubscriptionResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    target_url: str
    events: List[str]

    class Config:
        from_attributes = True


def verify_hmac_signature(secret: str, raw_body: bytes, timestamp_str: str, signature: str) -> bool:
    """
    Vérification stricte de la signature HMAC-SHA256 en temps constant (Guide Développeur p.23).
    Formule : HMAC_SHA256(secret, timestamp + '.' + raw_body).
    """
    try:
        ts = int(timestamp_str)
    except (ValueError, TypeError):
        return False

    # Contrôle de la fenêtre anti-rejeu (300 secondes = 5 minutes)
    if abs(time.time() - ts) > 300:
        return False

    expected = hmac.new(
        secret.encode("utf-8"),
        f"{ts}.".encode("utf-8") + raw_body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


@router.post(
    "/incoming/{project_id}",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Déclencheur Webhook entrant pour pipelines CI/CD (Vérifié par signature HMAC)",
)
async def trigger_run_via_webhook(
    project_id: uuid.UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    x_odace_timestamp: str = Header(..., alias="X-Odace-Timestamp", description="Horodatage Unix (anti-rejeu 300s)"),
    x_odace_signature: str = Header(..., alias="X-Odace-Signature", description="Signature HMAC-SHA256"),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Endpoint déclencheur pour GitHub Actions, GitLab CI ou Jenkins.
    Exige la signature HMAC et l'horodatage anti-rejeu conformément à l'étape 7 du guide.
    """
    raw_body = await request.body()

    # 1. Récupération du projet
    project = await db.get(Project, project_id)
    if not project:
        raise APIError("PROJECT_NOT_FOUND", f"Projet {project_id} introuvable", 404)

    # 2. Récupérer le secret du projet (ou valeur par défaut dédiée au projet)
    # Dans une architecture de production, ce secret provient du coffre (Vault).
    sub_stmt = select(WebhookSub).where(WebhookSub.project_id == project_id)
    sub_res = await db.execute(sub_stmt)
    sub = sub_res.scalars().first()
    secret = sub.secret_vault_ref if sub else f"odace-ci-secret-{str(project_id)[:8]}"

    # 3. Contrôle anti-rejeu (timestamp < 300s)
    try:
        ts = int(x_odace_timestamp)
        if abs(time.time() - ts) > 300:
            audit = AuditLog(
                actor=f"ci-webhook:{project.name}",
                action="WEBHOOK_REPLAY_ATTACK",
                object_type="Project",
                object_id=str(project_id),
                ip_address=request.client.host if request.client else "unknown",
                details={"reason": "Horodatage expiré (>300s)", "provided_ts": x_odace_timestamp},
            )
            db.add(audit)
            await db.commit()
            raise APIError("WEBHOOK_REPLAY_ATTACK", "Horodatage expiré ou tentative de rejeu (>300s).", 401)
    except ValueError:
        raise APIError("WEBHOOK_INVALID_TIMESTAMP", "Format de X-Odace-Timestamp invalide.", 400)

    # 4. Vérification de la signature HMAC-SHA256 en temps constant
    is_valid = verify_hmac_signature(secret, raw_body, x_odace_timestamp, x_odace_signature)
    if not is_valid:
        audit = AuditLog(
            actor=f"ci-webhook:{project.name}",
            action="WEBHOOK_SIGNATURE_INVALID",
            object_type="Project",
            object_id=str(project_id),
            ip_address=request.client.host if request.client else "unknown",
            details={"reason": "Signature HMAC non conforme"},
        )
        db.add(audit)
        await db.commit()
        raise APIError("WEBHOOK_INVALID_SIGNATURE", "Signature HMAC-SHA256 invalide ou secret non reconnu.", 401)

    # 5. Décodage du corps JSON
    try:
        data = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        payload = WebhookIncomingPayload(**data)
    except Exception as e:
        raise APIError("WEBHOOK_BAD_PAYLOAD", f"Corps JSON invalide : {e}", 400)

    # 6. Résolution de la cible
    target: Optional[Target] = None
    if payload.target_id:
        target = await db.get(Target, payload.target_id)
    elif payload.target_name:
        t_stmt = select(Target).join(Target.environment).where(
            Target.name == payload.target_name
        )
        t_res = await db.execute(t_stmt)
        target = t_res.scalars().first()

    if not target:
        # Sélectionner la première cible active du projet par défaut
        t_stmt = select(Target).join(Target.environment).where(
            Target.is_active == True
        )
        t_res = await db.execute(t_stmt)
        target = t_res.scalars().first()
        if not target:
            raise APIError("TARGET_NOT_FOUND", "Aucune cible applicative disponible.", 404)

    # 7. Résolution du script / test_asset
    asset: Optional[TestAsset] = None
    if payload.asset_id:
        asset = await db.get(TestAsset, payload.asset_id)
    elif payload.asset_name:
        a_stmt = select(TestAsset).where(
            TestAsset.project_id == project_id, TestAsset.name == payload.asset_name
        )
        a_res = await db.execute(a_stmt)
        asset = a_res.scalars().first()

    if not asset:
        a_stmt = select(TestAsset).where(TestAsset.project_id == project_id)
        a_res = await db.execute(a_stmt)
        asset = a_res.scalars().first()
        if not asset:
            # Fallback sur n'importe quel asset si projet récent
            a_stmt = select(TestAsset)
            a_res = await db.execute(a_stmt)
            asset = a_res.scalars().first()
            if not asset:
                raise APIError("ASSET_NOT_FOUND", "Aucun asset de test disponible pour ce projet.", 404)

    # 8. Clé d'idempotence automatique si non fournie par le pipeline
    actual_idempotency = idempotency_key or f"ci-hook-{project_id}-{x_odace_timestamp}-{uuid.uuid4().hex[:8]}"

    # 9. Création et lancement du tir via RunService
    run_req = RunCreateRequest(
        project_id=project_id,
        asset_id=asset.id,
        target_id=target.id,
        public_params={
            "threads": payload.threads,
            "duration_sec": payload.duration_sec,
            **payload.public_params,
        },
    )

    # Utilisateur technique de CI/CD
    ci_user = CurrentUser(
        id=str(uuid.uuid4()),
        username=f"ci-pipeline-{project.name.lower().replace(' ', '-')}",
        full_name=f"CI/CD Pipeline {project.name}",
        email=f"ci-{project.name.lower().replace(' ', '-')}@odace.ci",
        roles=[UserRole.TESTER, UserRole.DEVELOPER],
        department="CI/CD Automation",
        avatar="CI",
        allowed_projects=[str(project_id)],
    )

    service = RunService(db)

    run, created = await service.create_run(run_req, actual_idempotency, ci_user)

    if created:
        await db.commit()
        background_tasks.add_task(execute_run_task, run.id)

    # Tracé dans audit_log
    audit = AuditLog(
        actor=ci_user.username,
        action="WEBHOOK_TRIGGER_RUN",
        object_type="Run",
        object_id=str(run.id),
        ip_address=request.client.host if request.client else "unknown",
        details={
            "project_name": project.name,
            "target_name": target.name,
            "asset_name": asset.name,
            "idempotency_key": actual_idempotency,
        },
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "ACCEPTED" if created else "ALREADY_EXISTS",
        "run_id": str(run.id),
        "idempotency_key": actual_idempotency,
        "gate_url": f"/api/v1/runs/{run.id}/gate",
        "poll_example": f"curl -sS '$ORCHESTRA/runs/{run.id}/gate?wait=900' | jq -e '.verdict == \"CONFORME\"'",
        "created": created,
    }


@router.post(
    "/subscriptions",
    response_model=WebhookSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un abonnement de webhook sortant",
)
async def create_webhook_subscription(
    body: WebhookSubscriptionRequest,
    user: CurrentUser = Depends(require_role(UserRole.ADMIN, UserRole.RESPONSABLE)),
    db: AsyncSession = Depends(get_db_session),
):
    """Enregistre une URL de callback pour être notifié de la fin des exécutions."""
    sub = WebhookSub(
        project_id=body.project_id,
        target_url=body.target_url,
        secret_vault_ref=body.secret,
        events=body.events,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub


@router.get(
    "/subscriptions/{project_id}",
    response_model=List[WebhookSubscriptionResponse],
    summary="Lister les abonnements de webhooks pour un projet",
)
async def list_webhook_subscriptions(
    project_id: uuid.UUID,
    user: CurrentUser = Depends(require_role(UserRole.ADMIN, UserRole.RESPONSABLE, UserRole.TECH_LEAD)),
    db: AsyncSession = Depends(get_db_session),
):
    stmt = select(WebhookSub).where(WebhookSub.project_id == project_id)
    res = await db.execute(stmt)
    return list(res.scalars().all())
