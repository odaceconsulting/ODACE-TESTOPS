"""Initial schema with 12 core tables and target reservation

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-28 18:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Types énumérés PostgreSQL avec create_type=False pour éviter les créations doubles
run_state_enum = postgresql.ENUM(
    "QUEUED", "PREPARING", "RUNNING", "COLLECTING", "EVALUATING",
    "FINISHED", "FAILED", "TIMEOUT", "CANCELED",
    name="runstate",
    create_type=False,
)
run_result_enum = postgresql.ENUM(
    "SUCCESS", "FAILED_GATES", "FAILED_EXEC", "SATURATED",
    name="runresult",
    create_type=False,
)
human_validation_enum = postgresql.ENUM(
    "EN_ATTENTE", "APPROUVE", "REJETE", "SANS_OBJET",
    name="humanvalidation",
    create_type=False,
)
test_tool_enum = postgresql.ENUM(
    "JMETER", "POSTMAN", "PLAYWRIGHT", "SELENIUM", "LOCUST", "K6", "LOADRUNNER_VUGEN", "ROBOT_FRAMEWORK", "ECHO",
    name="testtool",
    create_type=False,
)
env_type_enum = postgresql.ENUM(
    "DEV", "RECETTE", "PREPROD", "PROD",
    name="environmenttype",
    create_type=False,
)


def upgrade() -> None:
    # 1. Création idempotente des énumérations en PostgreSQL
    bind = op.get_bind()
    enums = [
        ("runstate", "'QUEUED', 'PREPARING', 'RUNNING', 'COLLECTING', 'EVALUATING', 'FINISHED', 'FAILED', 'TIMEOUT', 'CANCELED'"),
        ("runresult", "'SUCCESS', 'FAILED_GATES', 'FAILED_EXEC', 'SATURATED'"),
        ("humanvalidation", "'EN_ATTENTE', 'APPROUVE', 'REJETE', 'SANS_OBJET'"),
        ("testtool", "'JMETER', 'POSTMAN', 'PLAYWRIGHT', 'SELENIUM', 'LOCUST', 'K6', 'LOADRUNNER_VUGEN', 'ROBOT_FRAMEWORK', 'ECHO'"),
        ("environmenttype", "'DEV', 'RECETTE', 'PREPROD', 'PROD'"),
    ]
    for enum_name, values in enums:
        bind.execute(sa.text(f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{enum_name}') THEN CREATE TYPE {enum_name} AS ENUM ({values}); END IF; END $$;"))


    # 2. Table `project`
    op.create_table(
        "project",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("team", sa.String(length=100), nullable=False),
        sa.Column("max_concurrent_runs", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_project_name", "project", ["name"])

    # 3. Table `environment`
    op.create_table(
        "environment",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("env_type", env_type_enum, nullable=False, server_default="RECETTE"),
        sa.Column("allowed_hours", sa.String(length=100), nullable=True, server_default="08:00-22:00"),
    )
    op.create_index("ix_environment_project_id", "environment", ["project_id"])

    # 4. Table `target`
    op.create_table(
        "target",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("environment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("environment.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("url", sa.String(length=255), nullable=False),
        sa.Column("allowed_tool", test_tool_enum, nullable=False, server_default="JMETER"),
        sa.Column("max_charge", sa.Integer(), nullable=False, server_default="500"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_target_environment_id", "target", ["environment_id"])

    # 5. Table `target_reservation` (verrou persistant)
    op.create_table(
        "target_reservation",
        sa.Column("target_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("target.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("acquired_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_target_reservation_run_id", "target_reservation", ["run_id"])

    # 6. Table `test_asset`
    op.create_table(
        "test_asset",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("tool", test_tool_enum, nullable=False),
        sa.Column("version", sa.String(length=50), nullable=False),
        sa.Column("sha256_hash", sa.String(length=64), nullable=False),
        sa.Column("object_path", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_test_asset_project_id", "test_asset", ["project_id"])

    # 7. Table `run` (3 dimensions de verdict strictes)
    op.create_table(
        "run",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project.id"), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("test_asset.id"), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("target.id"), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("requested_by", sa.String(length=100), nullable=False),
        # 1. Dimension technique
        sa.Column("state", run_state_enum, nullable=False, server_default="QUEUED"),
        # 2. Dimension calculée
        sa.Column("result", run_result_enum, nullable=True),
        # 3. Dimension humaine
        sa.Column("validation", human_validation_enum, nullable=False, server_default="EN_ATTENTE"),
        sa.Column("validation_comment", sa.Text(), nullable=True),
        sa.Column("validated_by", sa.String(length=100), nullable=True),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("project_id", "idempotency_key", name="uq_run_project_idempotency"),
    )
    op.create_index("ix_run_project_id", "run", ["project_id"])
    op.create_index("ix_run_state", "run", ["state"])
    op.create_index("ix_run_result", "run", ["result"])
    op.create_index("ix_run_validation", "run", ["validation"])

    # 8. Table `run_param`
    op.create_table(
        "run_param",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("run.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.String(length=255), nullable=False),
        sa.Column("is_secret_ref", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index("ix_run_param_run_id", "run_param", ["run_id"])

    # 9. Table `run_event`
    op.create_table(
        "run_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("run.id", ondelete="CASCADE"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("from_state", sa.String(length=50), nullable=True),
        sa.Column("to_state", sa.String(length=50), nullable=False),
        sa.Column("cause", sa.String(length=255), nullable=False),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index("ix_run_event_run_id", "run_event", ["run_id"])

    # 10. Table `artifact`
    op.create_table(
        "artifact",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("run.id", ondelete="CASCADE"), nullable=False),
        sa.Column("artifact_type", sa.String(length=50), nullable=False),
        sa.Column("object_path", sa.String(length=255), nullable=False),
        sa.Column("sha256_hash", sa.String(length=64), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_artifact_run_id", "artifact", ["run_id"])

    # 11. Table `threshold`
    op.create_table(
        "threshold",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project.id", ondelete="CASCADE"), nullable=False),
        sa.Column("environment_name", sa.String(length=50), nullable=False),
        sa.Column("metric_name", sa.String(length=50), nullable=False),
        sa.Column("operator", sa.String(length=10), nullable=False),
        sa.Column("target_value", sa.Float(), nullable=False),
        sa.Column("is_blocking", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_threshold_project_id", "threshold", ["project_id"])

    # 12. Table `schedule`
    op.create_table(
        "schedule",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("test_asset.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cron_expression", sa.String(length=50), nullable=False),
        sa.Column("timezone", sa.String(length=50), nullable=False, server_default="UTC"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_schedule_asset_id", "schedule", ["asset_id"])

    # 13. Table `webhook_sub`
    op.create_table(
        "webhook_sub",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_url", sa.String(length=255), nullable=False),
        sa.Column("secret_vault_ref", sa.String(length=255), nullable=False),
        sa.Column("events", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
    )
    op.create_index("ix_webhook_sub_project_id", "webhook_sub", ["project_id"])

    # 14. Table `audit_log`
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("actor", sa.String(length=100), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("object_type", sa.String(length=50), nullable=False),
        sa.Column("object_id", sa.String(length=100), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index("ix_audit_log_timestamp", "audit_log", ["timestamp"])
    op.create_index("ix_audit_log_actor", "audit_log", ["actor"])


def downgrade() -> None:
    # Suppression des tables dans l'ordre inverse des dépendances
    op.drop_table("audit_log")
    op.drop_table("webhook_sub")
    op.drop_table("schedule")
    op.drop_table("threshold")
    op.drop_table("artifact")
    op.drop_table("run_event")
    op.drop_table("run_param")
    op.drop_table("run")
    op.drop_table("test_asset")
    op.drop_table("target_reservation")
    op.drop_table("target")
    op.drop_table("environment")
    op.drop_table("project")

    # Suppression des énumérations
    bind = op.get_bind()
    env_type_enum.drop(bind, checkfirst=True)
    test_tool_enum.drop(bind, checkfirst=True)
    human_validation_enum.drop(bind, checkfirst=True)
    run_result_enum.drop(bind, checkfirst=True)
    run_state_enum.drop(bind, checkfirst=True)
