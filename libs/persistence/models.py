"""
Modèles de persistance SQLAlchemy (12 tables du socle + réservation persistante).
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from libs.domain.enums import (
    EnvironmentType,
    HumanValidation,
    RunResult,
    RunState,
    TestTool,
    UserRole,
)
from libs.persistence.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Project(Base):
    __tablename__ = "project"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    team: Mapped[str] = mapped_column(String(100), nullable=False)
    max_concurrent_runs: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    environments: Mapped[list["Environment"]] = relationship(back_populates="project")
    assets: Mapped[list["TestAsset"]] = relationship(back_populates="project")


class Environment(Base):
    __tablename__ = "environment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    env_type: Mapped[EnvironmentType] = mapped_column(Enum(EnvironmentType), default=EnvironmentType.RECETTE)
    allowed_hours: Mapped[Optional[str]] = mapped_column(String(100), default="08:00-22:00")

    project: Mapped["Project"] = relationship(back_populates="environments")
    targets: Mapped[list["Target"]] = relationship(back_populates="environment")


class Target(Base):
    __tablename__ = "target"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    environment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("environment.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(String(255), nullable=False)
    allowed_tool: Mapped[TestTool] = mapped_column(Enum(TestTool), default=TestTool.JMETER)
    max_charge: Mapped[int] = mapped_column(Integer, default=500)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    environment: Mapped["Environment"] = relationship(back_populates="targets")


class TargetReservation(Base):
    """Réservation persistante d'une cible pendant toute la durée d'une exécution."""
    __tablename__ = "target_reservation"

    target_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("target.id", ondelete="CASCADE"), primary_key=True)
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class TestAsset(Base):
    __tablename__ = "test_asset"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    tool: Mapped[TestTool] = mapped_column(Enum(TestTool), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    object_path: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    project: Mapped["Project"] = relationship(back_populates="assets")


class Run(Base):
    """Table centrale d'exécution : porte les 3 dimensions de verdict."""
    __tablename__ = "run"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project.id"), nullable=False)
    asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("test_asset.id"), nullable=False)
    target_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("target.id"), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    requested_by: Mapped[str] = mapped_column(String(100), nullable=False)

    # 1. Dimension technique
    state: Mapped[RunState] = mapped_column(Enum(RunState), default=RunState.QUEUED, nullable=False)
    # 2. Dimension calculée
    result: Mapped[Optional[RunResult]] = mapped_column(Enum(RunResult), nullable=True)
    # 3. Dimension humaine
    validation: Mapped[HumanValidation] = mapped_column(
        Enum(HumanValidation), default=HumanValidation.EN_ATTENTE, nullable=False
    )
    validation_comment: Mapped[Optional[str]] = mapped_column(Text)
    validated_by: Mapped[Optional[str]] = mapped_column(String(100))
    validated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("project_id", "idempotency_key", name="uq_run_project_idempotency"),
    )

    params: Mapped[list["RunParam"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    events: Mapped[list["RunEvent"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    artifacts: Mapped[list["Artifact"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class RunParam(Base):
    __tablename__ = "run_param"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("run.id", ondelete="CASCADE"), nullable=False)
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    is_secret_ref: Mapped[bool] = mapped_column(Boolean, default=False)

    run: Mapped["Run"] = relationship(back_populates="params")


class RunEvent(Base):
    """Journal des changements d'état (écriture seule)."""
    __tablename__ = "run_event"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("run.id", ondelete="CASCADE"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    from_state: Mapped[Optional[str]] = mapped_column(String(50))
    to_state: Mapped[str] = mapped_column(String(50), nullable=False)
    cause: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSONB)

    run: Mapped["Run"] = relationship(back_populates="events")


class Artifact(Base):
    """Preuves produites et archivées dans MinIO."""
    __tablename__ = "artifact"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("run.id", ondelete="CASCADE"), nullable=False)
    artifact_type: Mapped[str] = mapped_column(String(50), nullable=False)  # jtl, html_report, screenshot, log
    object_path: Mapped[str] = mapped_column(String(255), nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    run: Mapped["Run"] = relationship(back_populates="artifacts")


class Threshold(Base):
    __tablename__ = "threshold"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    environment_name: Mapped[str] = mapped_column(String(50), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(50), nullable=False)  # p95_ms, error_rate, throughput
    operator: Mapped[str] = mapped_column(String(10), nullable=False)     # <=, >=, <, >
    target_value: Mapped[float] = mapped_column(Float, nullable=False)
    is_blocking: Mapped[bool] = mapped_column(Boolean, default=True)


class Schedule(Base):
    __tablename__ = "schedule"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("test_asset.id", ondelete="CASCADE"), nullable=False)
    cron_expression: Mapped[str] = mapped_column(String(50), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class WebhookSub(Base):
    __tablename__ = "webhook_sub"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    target_url: Mapped[str] = mapped_column(String(255), nullable=False)
    secret_vault_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    events: Mapped[list[str]] = mapped_column(JSONB, default=list)


class AuditLog(Base):
    """Piste d'audit légale immuable en écriture seule."""
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    actor: Mapped[str] = mapped_column(String(100), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    object_type: Mapped[str] = mapped_column(String(50), nullable=False)
    object_id: Mapped[str] = mapped_column(String(100), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    details: Mapped[Optional[dict]] = mapped_column(JSONB)


class User(Base):
    """Utilisateurs et acteurs habilités de la plateforme ODACE TestOps."""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    roles: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    avatar: Mapped[str] = mapped_column(String(10), default="??")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

