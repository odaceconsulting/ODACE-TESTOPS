"""
Service métier de traitement des demandes d'exécution.
Garantit l'idempotence, les contrôles avant envoi et l'audit.
"""

import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.core.authentication import CurrentUser
from apps.api.core.errors import APIError
from apps.api.modules.runs.repository import RunRepository
from libs.contracts.runs import RunCreateRequest, RunValidationRequest
from libs.domain.enums import HumanValidation, RunState, UserRole
from apps.orchestrator.reservations import TargetReservationService
from libs.persistence.models import AuditLog, Project, Run, RunParam, Target, TestAsset, utc_now


class RunService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = RunRepository(session)

    async def validate_preflight(
        self,
        request: RunCreateRequest,
        user: CurrentUser,
    ) -> dict:
        """
        Contrôles préalables au tir (Étape 2 & 3 du Guide) :
        - RG1 : Cible libre (aucun bail actif de test de charge concurrent)
        - RG2 : Cible autorisée et active
        - RG7 : Respect du quota de charge simultané du projet
        """
        # 1. Vérification du projet
        project = await self.session.get(Project, request.project_id)
        if not project:
            raise APIError("PROJECT_NOT_FOUND", "Projet introuvable.", 404)

        # 2. Vérification de la cible
        target = await self.session.get(Target, request.target_id)
        if not target:
            raise APIError("TARGET_NOT_FOUND", "Cible applicative introuvable.", 404)

        # 3. Vérification du script / asset
        asset = await self.session.get(TestAsset, request.asset_id)
        if not asset:
            raise APIError("ASSET_NOT_FOUND", "Script de test introuvable.", 404)

        # RG2 : Cible active et compatible
        target_active = bool(target.is_active)
        tool_match = (target.allowed_tool.value.lower() == asset.tool.value.lower()) if hasattr(target.allowed_tool, 'value') else True

        # RG1 : Cible libre
        res_service = TargetReservationService(self.session)
        is_busy = await res_service.is_target_busy(request.target_id)
        target_free = not is_busy

        # RG7 : Quota de charge simultané
        active_count = await self.repo.count_active_runs_for_project(request.project_id)
        quota_ok = active_count < project.max_concurrent_runs

        allowed = target_active and target_free and quota_ok and tool_match

        reasons = []
        if not target_active:
            reasons.append("Cible inactive (RG2)")
        if not target_free:
            reasons.append("Cible déjà occupée par un autre tir de charge (RG1)")
        if not quota_ok:
            reasons.append(f"Quota simultané atteint : {active_count}/{project.max_concurrent_runs} runs en cours (RG7)")
        if not tool_match:
            reasons.append(f"Outil {asset.tool} incompatible avec la cible ({target.allowed_tool})")

        return {
            "allowed": allowed,
            "project_name": project.name,
            "target_name": target.name,
            "target_url": target.url,
            "asset_name": asset.name,
            "active_runs": active_count,
            "max_concurrent_runs": project.max_concurrent_runs,
            "checks": {
                "target_active": target_active,
                "target_free": target_free,
                "quota_ok": quota_ok,
                "tool_compatible": tool_match,
            },
            "reasons": reasons,
        }

    async def create_run(
        self,
        request: RunCreateRequest,
        idempotency_key: str,
        user: CurrentUser,
    ) -> tuple[Run, bool]:
        """
        Crée ou retrouve une exécution selon la clé d'idempotence.
        Applique rigoureusement les règles de gestion RG1, RG2 et RG7.
        Retourne (run, created: bool).
        """
        # 1. Idempotence : si la clé existe déjà pour ce projet, retourner l'existant
        existing = await self.repo.find_by_idempotency(request.project_id, idempotency_key)
        if existing:
            return existing, False

        # 2. Vérification du projet
        project = await self.session.get(Project, request.project_id)
        if not project:
            raise APIError("PROJECT_NOT_FOUND", "Projet introuvable.", 404)

        # 3. Contrôle RG7 : Quota de charge simultané
        active_count = await self.repo.count_active_runs_for_project(request.project_id)
        if active_count >= project.max_concurrent_runs:
            raise APIError(
                code="QUOTA_EXCEEDED",
                message=f"Quota de charge simultané dépassé pour le projet « {project.name} » ({active_count}/{project.max_concurrent_runs} max) (RG7).",
                status_code=429,
            )

        # 4. Contrôle RG2 : Cible active
        target = await self.session.get(Target, request.target_id)
        if not target or not target.is_active:
            raise APIError(
                code="TARGET_UNAVAILABLE",
                message="La cible applicative est introuvable ou inactive (RG2).",
                status_code=400,
            )

        # 5. Contrôle et réservation RG1 : Cible libre
        run_id = uuid.uuid4()
        res_service = TargetReservationService(self.session)
        acquired = await res_service.acquire_lease(target_id=target.id, run_id=run_id, duration_minutes=30)
        if not acquired:
            raise APIError(
                code="TARGET_BUSY",
                message=f"La cible « {target.name} » est actuellement occupée par un autre tir de charge en cours (RG1).",
                status_code=409,
            )

        # 6. Création de l'entité Run
        run = Run(
            id=run_id,
            project_id=request.project_id,
            asset_id=request.asset_id,
            target_id=request.target_id,
            idempotency_key=idempotency_key,
            requested_by=user.username,
            state=RunState.QUEUED,
            validation=HumanValidation.EN_ATTENTE,
            created_at=utc_now(),
            params=[],
            events=[],
            artifacts=[],
        )

        # 7. Paramètres associés
        for k, v in request.public_params.items():
            run.params.append(RunParam(key=k, value=str(v), is_secret_ref=False))
        for k, v in request.secret_vault_refs.items():
            run.params.append(RunParam(key=k, value=str(v), is_secret_ref=True))

        created_run = await self.repo.create_run(run)

        # 8. Inscription légale dans le journal d'audit
        audit = AuditLog(
            actor=user.username,
            action="run.create",
            object_type="run",
            object_id=str(run_id),
            details={
                "project_id": str(request.project_id),
                "target_id": str(request.target_id),
                "idempotency_key": idempotency_key,
                "quota_simultane": f"{active_count + 1}/{project.max_concurrent_runs}",
            },
        )
        self.session.add(audit)
        await self.session.flush()

        return created_run, True

    async def validate_run(
        self,
        run_id: uuid.UUID,
        request: RunValidationRequest,
        user: CurrentUser,
    ) -> Run:
        run = await self.repo.get_by_id(run_id)
        if not run:
            raise APIError("RUN_NOT_FOUND", f"Exécution {run_id} introuvable", 404)

        updated = await self.repo.update_validation(
            run=run,
            decision=request.decision.value,
            comment=request.comment,
            user=user.username,
        )

        audit = AuditLog(
            actor=user.username,
            action=f"run.validation.{request.decision.value.lower()}",
            object_type="run",
            object_id=str(run_id),
            details={"decision": request.decision.value, "comment": request.comment},
        )
        self.session.add(audit)
        await self.session.flush()

        return updated

    async def list_runs(self, project_id: Optional[uuid.UUID] = None) -> List[Run]:
        return await self.repo.list_runs(project_id)

    async def get_run(self, run_id: uuid.UUID) -> Run:
        run = await self.repo.get_by_id(run_id)
        if not run:
            raise APIError("RUN_NOT_FOUND", f"Exécution {run_id} introuvable", 404)
        return run
