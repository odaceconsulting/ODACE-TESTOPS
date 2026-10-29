"""
Machine à états d'exécution de l'orchestrateur.
L'orchestrateur est le SEUL composant autorisé à effectuer une transition d'état.
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from libs.domain.enums import RunState
from libs.domain.rules import validate_transition
from libs.persistence.models import Run, RunEvent


class StateMachineService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def transition(
        self,
        run: Run,
        target_state: RunState,
        cause: str,
        details: Optional[dict] = None,
    ) -> Run:
        """
        Effectue une transition d'état atomique en base avec inscription d'événement.
        Lève IllegalTransitionError si la transition est interdite.
        """
        validate_transition(run.state, target_state)

        old_state = run.state.value
        run.state = target_state

        event = RunEvent(
            run_id=run.id,
            from_state=old_state,
            to_state=target_state.value,
            cause=cause,
            details=details or {},
        )
        self.session.add(event)
        await self.session.flush()

        return run
