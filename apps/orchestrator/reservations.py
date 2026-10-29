"""
Gestion persistante des réservations de cibles.
Garantit la règle d'or RG1 : Un seul test de charge à la fois sur une cible.
"""

import uuid
from datetime import timedelta
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from libs.persistence.models import TargetReservation, utc_now


class TargetReservationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def acquire_lease(
        self,
        target_id: uuid.UUID,
        run_id: uuid.UUID,
        duration_minutes: int = 30,
    ) -> bool:
        """
        Tente de réserver la cible.
        Nettoie d'abord les baux expirés.
        Retourne True si la cible a été réservée, False si déjà occupée.
        """
        now = utc_now()
        # 1. Purge des baux expirés
        await self.session.execute(
            delete(TargetReservation).where(TargetReservation.expires_at < now)
        )

        # 2. Vérifie si déjà réservée
        res = await self.session.execute(
            select(TargetReservation).where(TargetReservation.target_id == target_id)
        )
        existing = res.scalar_one_or_none()
        if existing:
            return False

        # 3. Prendre la réservation
        lease = TargetReservation(
            target_id=target_id,
            run_id=run_id,
            acquired_at=now,
            expires_at=now + timedelta(minutes=duration_minutes),
        )
        self.session.add(lease)
        await self.session.flush()
        return True

    async def is_target_busy(self, target_id: uuid.UUID) -> bool:
        """Indique si la cible fait l'objet d'un bail de réservation actif."""
        now = utc_now()
        await self.session.execute(
            delete(TargetReservation).where(TargetReservation.expires_at < now)
        )
        res = await self.session.execute(
            select(TargetReservation).where(
                TargetReservation.target_id == target_id,
                TargetReservation.expires_at >= now,
            )
        )
        return res.scalar_one_or_none() is not None

    async def release_lease(self, target_id: uuid.UUID, run_id: uuid.UUID) -> None:
        """Libère la réservation à la fin du test (FINISHED, FAILED, CANCELLED ou INDETERMINATE)."""
        await self.session.execute(
            delete(TargetReservation).where(
                TargetReservation.target_id == target_id,
                TargetReservation.run_id == run_id,
            )
        )
        await self.session.flush()
