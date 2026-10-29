"""
Accès persistant aux exécutions de test dans PostgreSQL.
"""

import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from libs.persistence.models import Run, RunEvent, TargetReservation, utc_now


class RunRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, run_id: uuid.UUID) -> Optional[Run]:
        result = await self.session.execute(select(Run).where(Run.id == run_id))
        return result.scalar_one_or_none()

    async def find_by_idempotency(self, project_id: uuid.UUID, idempotency_key: str) -> Optional[Run]:
        result = await self.session.execute(
            select(Run).where(
                Run.project_id == project_id,
                Run.idempotency_key == idempotency_key
            )
        )
        return result.scalar_one_or_none()

    async def list_runs(self, project_id: Optional[uuid.UUID] = None, limit: int = 50) -> List[Run]:
        query = select(Run).order_by(Run.created_at.desc()).limit(limit)
        if project_id:
            query = query.where(Run.project_id == project_id)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create_run(self, run: Run) -> Run:
        self.session.add(run)
        await self.session.flush()

        # Événement initial d'insertion
        event = RunEvent(
            run_id=run.id,
            from_state=None,
            to_state=run.state.value,
            cause="Demande reçue et validée par l'API",
        )
        self.session.add(event)
        await self.session.flush()
        return run

    async def update_validation(
        self,
        run: Run,
        decision: str,
        comment: Optional[str],
        user: str
    ) -> Run:
        run.validation = decision  # type: ignore
        run.validation_comment = comment
        run.validated_by = user
        run.validated_at = utc_now()
        await self.session.flush()
        return run

    async def count_active_runs_for_project(self, project_id: uuid.UUID) -> int:
        """Compte les exécutions actuellement actives pour vérifier le quota RG7."""
        from sqlalchemy import func
        from libs.domain.enums import RunState
        active_states = [
            RunState.QUEUED,
            RunState.DISPATCHED,
            RunState.RUNNING,
        ]
        result = await self.session.execute(
            select(func.count(Run.id)).where(
                Run.project_id == project_id,
                Run.state.in_(active_states),
            )
        )
        return result.scalar() or 0
