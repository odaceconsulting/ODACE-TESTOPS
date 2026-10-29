"""
Routes API pour le Catalogue des Scripts et Actifs de Test.
Conforme à l'Étape 2 & 5/6 du Guide Développeurs.
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
from libs.persistence.models import TestAsset, Project
from libs.domain.enums import TestTool, UserRole

router = APIRouter(prefix="/assets", tags=["Catalogue d'Actifs de Test"])


class TestAssetOut(BaseModel):
    id: UUID
    project_id: UUID
    project_name: Optional[str] = None
    name: str
    tool: TestTool
    version: str
    sha256_hash: str
    object_path: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[TestAssetOut])
async def list_assets(
    db: AsyncSession = Depends(get_db_session),
    user=Depends(require_role(
        UserRole.AUDITOR,
        UserRole.TESTER,
        UserRole.DEVELOPER,
        UserRole.TECH_LEAD,
        UserRole.RESPONSABLE,
        UserRole.ADMIN,
        UserRole.EXPLOITATION,
    )),
):
    """
    Retourne la liste des plans JMeter et suites Selenium versionnés avec leur empreinte SHA-256.
    Extrait directement de la table test_asset.
    """
    stmt = (
        select(TestAsset, Project.name.label("project_name"))
        .join(Project, TestAsset.project_id == Project.id, isouter=True)
        .order_by(TestAsset.created_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    assets = []
    for asset, proj_name in rows:
        item = TestAssetOut(
            id=asset.id,
            project_id=asset.project_id,
            project_name=proj_name or "Projet",
            name=asset.name,
            tool=asset.tool,
            version=asset.version,
            sha256_hash=asset.sha256_hash,
            object_path=asset.object_path,
            created_at=asset.created_at,
        )
        assets.append(item)

    return assets
