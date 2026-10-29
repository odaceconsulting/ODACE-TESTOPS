"""
Routes API pour le Journal d'Audit et la Preuve Légale.
Conforme à l'Étape 2 & 9 du Guide Développeurs.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.core.authorization import require_role
from libs.persistence.database import get_db_session
from libs.persistence.models import AuditLog
from libs.domain.enums import UserRole

router = APIRouter(prefix="/audit", tags=["Journal d'Audit Légale"])


class AuditLogOut(BaseModel):
    id: UUID
    timestamp: datetime
    actor: str
    action: str
    object_type: str
    object_id: Optional[str] = None
    ip_address: Optional[str] = None
    details: Optional[dict] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[AuditLogOut])
async def list_audit_trail(
    limit: int = 50,
    db: AsyncSession = Depends(get_db_session),
    user=Depends(require_role(
        UserRole.AUDITOR,
        UserRole.ADMIN,
        UserRole.TECH_LEAD,
        UserRole.RESPONSABLE,
        UserRole.EXPLOITATION,
        UserRole.TESTER,
        UserRole.DEVELOPER,
    )),
):
    """
    Retourne la piste d'audit immuable en écriture seule.
    Conforme aux exigences d'auditabilité légale et non-répudiation (R14).
    """
    stmt = (
        select(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    return res.scalars().all()
