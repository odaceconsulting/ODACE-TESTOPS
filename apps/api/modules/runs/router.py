"""
Routes HTTP pour la gestion des exécutions (Module Runs).
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, Header, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from apps.api.core.authentication import CurrentUser
from apps.api.core.authorization import require_role
from apps.api.core.errors import APIError
from apps.api.modules.runs.service import RunService
from apps.orchestrator.execution import execute_run_task
from libs.contracts.runs import QualityGateResponse, RunCreateRequest, RunResponse, RunValidationRequest
from libs.domain.enums import UserRole

from libs.persistence.database import get_db_session
from libs.persistence.models import Project, Environment

router = APIRouter(prefix="/runs", tags=["Runs"])


@router.post(
    "",
    response_model=RunResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Demander une nouvelle exécution de test (Idempotente)",
)
async def create_run(
    request: RunCreateRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    idempotency_key: str = Header(..., alias="Idempotency-Key", description="Clé d'idempotence unique"),
    user: CurrentUser = Depends(require_role(UserRole.DEVELOPER, UserRole.TESTER, UserRole.TECH_LEAD, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db_session),
):
    if not idempotency_key or len(idempotency_key.strip()) < 8:
        raise APIError(
            code="INVALID_IDEMPOTENCY_KEY",
            message="L'en-tête Idempotency-Key est obligatoire et doit faire au moins 8 caractères.",
            status_code=400,
        )

    service = RunService(db)
    run, created = await service.create_run(request, idempotency_key, user)

    # Si déjà existant, renvoyer HTTP 200 au lieu de 202
    if not created:
        response.status_code = status.HTTP_200_OK
    else:
        await db.commit()
        # Déclencher l'exécution réelle en arrière-plan
        background_tasks.add_task(execute_run_task, run.id)

    return run


@router.post(
    "/validate-preflight",
    summary="Valider les contrôles pré-lancement (RG1, RG2, RG7)",
)
async def validate_preflight(
    request: RunCreateRequest,
    user: CurrentUser = Depends(require_role(UserRole.DEVELOPER, UserRole.TESTER, UserRole.TECH_LEAD, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db_session),
):
    service = RunService(db)
    return await service.validate_preflight(request, user)


@router.get("", response_model=List[RunResponse], summary="Lister les exécutions")
async def list_runs(
    project_id: Optional[uuid.UUID] = None,
    user: CurrentUser = Depends(require_role(
        UserRole.DEVELOPER,
        UserRole.TESTER,
        UserRole.TECH_LEAD,
        UserRole.AUDITOR,
        UserRole.ADMIN,
        UserRole.RESPONSABLE,
        UserRole.EXPLOITATION,
    )),
    db: AsyncSession = Depends(get_db_session),
):
    service = RunService(db)
    return await service.list_runs(project_id)


@router.get("/{run_id}", response_model=RunResponse, summary="Détail d'une exécution")
async def get_run(
    run_id: uuid.UUID,
    user: CurrentUser = Depends(require_role(
        UserRole.DEVELOPER,
        UserRole.TESTER,
        UserRole.TECH_LEAD,
        UserRole.AUDITOR,
        UserRole.ADMIN,
        UserRole.RESPONSABLE,
        UserRole.EXPLOITATION,
    )),
    db: AsyncSession = Depends(get_db_session),
):
    service = RunService(db)
    return await service.get_run(run_id)


@router.post("/{run_id}/validate", response_model=RunResponse, summary="Enregistrer la décision humaine (Tech Lead)")
async def validate_run(
    run_id: uuid.UUID,
    body: RunValidationRequest,
    user: CurrentUser = Depends(require_role(UserRole.TECH_LEAD)),
    db: AsyncSession = Depends(get_db_session),
):
    service = RunService(db)
    return await service.validate_run(run_id, body, user)


@router.get(
    "/{run_id}/gate",
    response_model=QualityGateResponse,
    summary="Consulter le verdict de Quality Gate (avec long-polling optionnel ?wait=900)",
)
async def get_run_gate(
    run_id: uuid.UUID,
    wait: Optional[int] = Query(None, ge=0, le=900, description="Délai max d'attente en secondes pour long polling CI/CD"),
    user: CurrentUser = Depends(require_role(
        UserRole.DEVELOPER,
        UserRole.TESTER,
        UserRole.TECH_LEAD,
        UserRole.AUDITOR,
        UserRole.ADMIN,
        UserRole.RESPONSABLE,
        UserRole.EXPLOITATION,
    )),
    db: AsyncSession = Depends(get_db_session),
):
    service = RunService(db)
    return await service.get_quality_gate(run_id, wait=wait)

