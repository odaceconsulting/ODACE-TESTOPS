"""
Routes API pour la gestion des Projets, Environnements et Cibles.
Conforme à l'Étape 2 du Guide de Réalisation Développeurs.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from apps.api.core.authorization import require_role
from apps.api.core.errors import APIError
from libs.persistence.database import get_db_session
from libs.persistence.models import Project, Environment, Target, AuditLog
from libs.domain.enums import EnvironmentType, TestTool, UserRole

router = APIRouter(prefix="/projects", tags=["Projets & Cibles"])


class TargetOut(BaseModel):
    id: UUID
    name: str
    url: str
    allowed_tool: TestTool
    max_charge: int
    is_active: bool

    class Config:
        from_attributes = True


class EnvironmentOut(BaseModel):
    id: UUID
    name: str
    env_type: EnvironmentType
    allowed_hours: str
    targets: List[TargetOut] = []

    class Config:
        from_attributes = True


class TargetCreate(BaseModel):
    name: str = "API Principale"
    url: str = "http://localhost:8088"
    allowed_tool: str = "jmeter"
    max_charge: int = 500
    is_active: bool = True


class EnvironmentCreate(BaseModel):
    name: str = "Recette"
    env_type: str = "RECETTE"
    allowed_hours: str = "08:00-22:00"
    targets: Optional[List[TargetCreate]] = None


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    team: str
    max_concurrent_runs: int = 5
    environments: Optional[List[EnvironmentCreate]] = None
    target_name: Optional[str] = None
    target_url: Optional[str] = None
    allowed_tool: Optional[str] = "jmeter"
    max_charge: Optional[int] = 500


class ProjectOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    team: str
    max_concurrent_runs: int
    environments: List[EnvironmentOut] = []

    class Config:
        from_attributes = True


@router.get("", response_model=List[ProjectOut])
async def list_projects(
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
    Retourne la liste des projets avec leurs environnements et cibles autorisées.
    Alimenté directement depuis la base PostgreSQL (Étape 1 & 2 du Guide).
    """
    stmt = (
        select(Project)
        .options(
            selectinload(Project.environments).selectinload(Environment.targets)
        )
        .order_by(Project.name)
    )
    res = await db.execute(stmt)
    projects = res.scalars().all()
    return projects


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db_session),
    user=Depends(require_role(
        UserRole.RESPONSABLE,
        UserRole.ADMIN,
    )),
):
    """
    Création d'un nouveau projet avec quotas et environnements.
    Réservé au Responsable et à l'Administrateur selon la matrice RBAC.
    """
    clean_name = data.name.strip()
    if not clean_name:
        raise APIError(
            code="INVALID_PROJECT_NAME",
            message="Le nom du projet ne peut pas être vide.",
            status_code=400,
        )

    # Vérification de l'unicité du nom
    stmt_exist = select(Project).where(Project.name == clean_name)
    res_exist = await db.execute(stmt_exist)
    if res_exist.scalar_one_or_none():
        raise APIError(
            code="PROJECT_ALREADY_EXISTS",
            message=f"Un projet portant le nom '{clean_name}' existe déjà.",
            status_code=400,
        )

    new_project = Project(
        name=clean_name,
        description=data.description.strip() if data.description else None,
        team=data.team.strip() if data.team else "Équipe transverse",
        max_concurrent_runs=max(1, min(data.max_concurrent_runs, 20)),
    )
    db.add(new_project)
    await db.flush()

    # Création des environnements initiaux
    envs_to_create = data.environments if (data.environments and len(data.environments) > 0) else [
        EnvironmentCreate(name="Recette", env_type=EnvironmentType.RECETTE, allowed_hours="08:00-22:00")
    ]
    for env_data in envs_to_create:
        try:
            etype = EnvironmentType(env_data.env_type.upper())
        except Exception:
            etype = EnvironmentType.RECETTE
        env = Environment(
            project_id=new_project.id,
            name=env_data.name,
            env_type=etype,
            allowed_hours=env_data.allowed_hours,
        )
        db.add(env)
        await db.flush()

        # Création des cibles associées
        if env_data.targets and len(env_data.targets) > 0:
            for t_data in env_data.targets:
                try:
                    tool_enum = TestTool(t_data.allowed_tool.lower())
                except Exception:
                    tool_enum = TestTool.JMETER
                t_obj = Target(
                    environment_id=env.id,
                    name=t_data.name.strip() or f"Cible {env.name}",
                    url=t_data.url.strip() or "http://localhost:8088",
                    allowed_tool=tool_enum,
                    max_charge=max(1, t_data.max_charge),
                    is_active=t_data.is_active,
                )
                db.add(t_obj)
        elif data.target_url:
            # Si une cible a été spécifiée au niveau du projet, la lier au premier environnement
            try:
                tool_enum = TestTool(data.allowed_tool.lower()) if data.allowed_tool else TestTool.JMETER
            except Exception:
                tool_enum = TestTool.JMETER
            t_obj = Target(
                environment_id=env.id,
                name=data.target_name.strip() if data.target_name else f"Cible {env.name}",
                url=data.target_url.strip(),
                allowed_tool=tool_enum,
                max_charge=max(1, data.max_charge or 500),
                is_active=True,
            )
            db.add(t_obj)

    # Inscription dans le journal d'audit légal
    audit = AuditLog(
        actor=f"{user.full_name} ({user.username})",
        action="project.created",
        object_type="PROJECT",
        object_id=str(new_project.id),
        details={
            "name": new_project.name,
            "team": new_project.team,
            "max_concurrent_runs": new_project.max_concurrent_runs,
        },
    )
    db.add(audit)
    await db.commit()

    # Recharger avec les relations
    stmt = (
        select(Project)
        .options(
            selectinload(Project.environments).selectinload(Environment.targets)
        )
        .where(Project.id == new_project.id)
    )
    res = await db.execute(stmt)
    return res.scalar_one()

