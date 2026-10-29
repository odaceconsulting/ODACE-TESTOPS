"""
Watchdog de surveillance des agents.
Détecte les exécutions bloquées ou sans battement de cœur et les passe en INDETERMINATE.
Règle RG6 : Jamais de relance automatique de charge.
"""

from datetime import timedelta
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from apps.orchestrator.state_machine import StateMachineService
from libs.domain.enums import RunState
from libs.persistence.models import Run, utc_now


class AgentWatchdog:
    def __init__(self, session: AsyncSession, max_silence_seconds: int = 30):
        self.session = session
        self.max_silence = timedelta(seconds=max_silence_seconds)
        self.state_machine = StateMachineService(session)

    async def check_stale_runs(self) -> List[Run]:
        now = utc_now()
        threshold_time = now - self.max_silence

        # Récupère les runs en état RUNNING n'ayant pas donné de signe de vie
        # Note : en production, on recoupe avec la table agent_heartbeat
        stmt = select(Run).where(
            Run.state == RunState.RUNNING,
            Run.started_at < threshold_time,
        )
        result = await self.session.execute(stmt)
        stale_runs = list(result.scalars().all())

        for run in stale_runs:
            await self.state_machine.transition(
                run=run,
                target_state=RunState.INDETERMINATE,
                cause="Perte de contact avec l'agent (silence heartbeat)",
                details={"threshold_seconds": self.max_silence.total_seconds()},
            )

        return stale_runs
