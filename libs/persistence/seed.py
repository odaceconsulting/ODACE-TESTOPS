"""Script de peuplement initial (Seed Data) pour ODACE TestOps.

Alimente la base de données PostgreSQL avec :
- Projets et environnements d'entreprise (Recette, Pré-production)
- Cibles d'application avec quotas et outils autorisés
- Jeux d'actifs de test (JMeter, Selenium, K6)
- Seuils de Quality Gates (p95_ms <= 800ms, error_rate <= 1%)
- Exécutions de démonstration illustrant les 3 dimensions de verdict
- Piste d'audit initiale
"""

import asyncio
from datetime import datetime, timedelta, timezone
import uuid

from sqlalchemy import select
from libs.persistence.database import async_session_maker, engine
from libs.persistence.models import (
    Artifact,
    AuditLog,
    Environment,
    Project,
    Run,
    RunEvent,
    RunParam,
    Target,
    TestAsset,
    Threshold,
)
from libs.domain.enums import (
    EnvironmentType,
    HumanValidation,
    RunResult,
    RunState,
    TestTool,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def seed() -> None:
    print("🌱 Démarrage de l'initialisation des données de test (Seed)...")

    async with async_session_maker() as session:
        # Vérifier si des projets existent déjà
        res = await session.execute(select(Project).limit(1))
        if res.scalar_one_or_none() is not None:
            print("⚠️  Des données existent déjà en base. Annulation du seed pour préserver l'existant.")
            return

        # 1. Projets
        proj_facturation = Project(
            id=uuid.uuid4(),
            name="Gestion des factures",
            description="Plateforme de facturation automatisée et conformité comptable",
            team="Facturation & Finance Squad",
            max_concurrent_runs=3,
            created_at=utc_now() - timedelta(days=30),
        )
        proj_portail = Project(
            id=uuid.uuid4(),
            name="Portail clients B2B",
            description="Espace libre-service clients B2B et gestion des commandes",
            team="Portail B2B Squad",
            max_concurrent_runs=5,
            created_at=utc_now() - timedelta(days=20),
        )
        session.add_all([proj_facturation, proj_portail])
        await session.flush()

        # 2. Environnements
        env_recette = Environment(
            id=uuid.uuid4(),
            project_id=proj_facturation.id,
            name="Recette",
            env_type=EnvironmentType.RECETTE,
            allowed_hours="08:00-22:00",
        )
        env_preprod = Environment(
            id=uuid.uuid4(),
            project_id=proj_facturation.id,
            name="Pré-production",
            env_type=EnvironmentType.PREPROD,
            allowed_hours="19:00-06:00",
        )
        env_b2b_recette = Environment(
            id=uuid.uuid4(),
            project_id=proj_portail.id,
            name="Recette B2B",
            env_type=EnvironmentType.RECETTE,
            allowed_hours="08:00-20:00",
        )
        session.add_all([env_recette, env_preprod, env_b2b_recette])
        await session.flush()

        # 3. Cibles (Targets)
        target_api = Target(
            id=uuid.uuid4(),
            environment_id=env_recette.id,
            name="API Facturation Recette",
            url="https://recette-factures.odace-test.internal/api/v1",
            allowed_tool=TestTool.JMETER,
            max_charge=500,
            is_active=True,
        )
        target_local = Target(
            id=uuid.uuid4(),
            environment_id=env_recette.id,
            name="Microservice Mock Test",
            url="http://localhost:8080/test",
            allowed_tool=TestTool.JMETER,
            max_charge=1000,
            is_active=True,
        )
        target_portal = Target(
            id=uuid.uuid4(),
            environment_id=env_b2b_recette.id,
            name="Web Portal Frontend",
            url="https://portal-recette.odace-test.internal",
            allowed_tool=TestTool.SELENIUM,
            max_charge=50,
            is_active=True,
        )
        session.add_all([target_api, target_local, target_portal])
        await session.flush()

        # 4. Actifs de test (Test Assets)
        asset_jmeter = TestAsset(
            id=uuid.uuid4(),
            project_id=proj_facturation.id,
            name="Tir de charge Facturation API",
            tool=TestTool.JMETER,
            version="1.3.0",
            sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            object_path="assets/jmeter/charge_factures_v1.3.jmx",
            created_at=utc_now() - timedelta(days=15),
        )
        asset_selenium = TestAsset(
            id=uuid.uuid4(),
            project_id=proj_portail.id,
            name="Parcours utilisateur Panier B2B",
            tool=TestTool.SELENIUM,
            version="2.0.1",
            sha256_hash="a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
            object_path="assets/selenium/b2b_checkout.side",
            created_at=utc_now() - timedelta(days=10),
        )
        asset_k6 = TestAsset(
            id=uuid.uuid4(),
            project_id=proj_facturation.id,
            name="Stress test Paiement Playwright",
            tool=TestTool.PLAYWRIGHT,
            version="1.0.0",
            sha256_hash="c254d823b1a197da180c6c10359cf7b860bb30722ecbec4d5ed04c32f242e5ef",
            object_path="assets/playwright/stress_paiement.js",
            created_at=utc_now() - timedelta(days=5),
        )
        session.add_all([asset_jmeter, asset_selenium, asset_k6])
        await session.flush()

        # 5. Seuils d'évaluation automatique (Thresholds / Quality Gates)
        gate_p95 = Threshold(
            id=uuid.uuid4(),
            project_id=proj_facturation.id,
            environment_name="Recette",
            metric_name="p95_ms",
            operator="<=",
            target_value=800.0,
            is_blocking=True,
        )
        gate_err = Threshold(
            id=uuid.uuid4(),
            project_id=proj_facturation.id,
            environment_name="Recette",
            metric_name="error_rate",
            operator="<=",
            target_value=0.01,
            is_blocking=True,
        )
        gate_rps = Threshold(
            id=uuid.uuid4(),
            project_id=proj_facturation.id,
            environment_name="Recette",
            metric_name="throughput_rps",
            operator=">=",
            target_value=100.0,
            is_blocking=False,
        )
        session.add_all([gate_p95, gate_err, gate_rps])
        await session.flush()

        # 6. Exécutions exemplaires (Runs démontrant les 3 dimensions)
        # Run 1 : Validé et conforme (CONFORME, VALIDE)
        run_success = Run(
            id=uuid.uuid4(),
            project_id=proj_facturation.id,
            asset_id=asset_jmeter.id,
            target_id=target_api.id,
            idempotency_key="seed-run-101-success",
            requested_by="dev.ops@odace.fr",
            state=RunState.FINISHED,
            result=RunResult.CONFORME,
            validation=HumanValidation.VALIDE,
            validation_comment="Excellents temps de réponse sous charge maximale (P95 = 412ms, 0% erreurs). Autorisé pour la release.",
            validated_by="techlead@odace.fr",
            validated_at=utc_now() - timedelta(hours=2),
            created_at=utc_now() - timedelta(hours=4),
            started_at=utc_now() - timedelta(hours=3, minutes=58),
            finished_at=utc_now() - timedelta(hours=3, minutes=40),
        )

        # Run 2 : Échec Quality Gate et rejeté (NON_CONFORME, REFUSE)
        run_failed_gates = Run(
            id=uuid.uuid4(),
            project_id=proj_facturation.id,
            asset_id=asset_jmeter.id,
            target_id=target_api.id,
            idempotency_key="seed-run-102-failed-gates",
            requested_by="dev.junior@odace.fr",
            state=RunState.FINISHED,
            result=RunResult.NON_CONFORME,
            validation=HumanValidation.REFUSE,
            validation_comment="Dépassement du seuil critique p95 (1450ms > 800ms autorisés). Déploiement bloqué en attente d'optimisation des index SQL.",
            validated_by="techlead@odace.fr",
            validated_at=utc_now() - timedelta(hours=1),
            created_at=utc_now() - timedelta(hours=2, minutes=30),
            started_at=utc_now() - timedelta(hours=2, minutes=28),
            finished_at=utc_now() - timedelta(hours=2, minutes=10),
        )

        # Run 3 : En attente de validation humaine du Tech Lead
        run_pending_val = Run(
            id=uuid.uuid4(),
            project_id=proj_facturation.id,
            asset_id=asset_k6.id,
            target_id=target_api.id,
            idempotency_key="seed-run-103-pending-val",
            requested_by="qa.engineer@odace.fr",
            state=RunState.FINISHED,
            result=RunResult.CONFORME,
            validation=HumanValidation.EN_ATTENTE,
            created_at=utc_now() - timedelta(minutes=45),
            started_at=utc_now() - timedelta(minutes=43),
            finished_at=utc_now() - timedelta(minutes=25),
        )

        # Run 4 : Actuellement en cours d'exécution
        run_running = Run(
            id=uuid.uuid4(),
            project_id=proj_portail.id,
            asset_id=asset_selenium.id,
            target_id=target_portal.id,
            idempotency_key="seed-run-104-running",
            requested_by="qa.engineer@odace.fr",
            state=RunState.RUNNING,
            result=None,
            validation=HumanValidation.EN_ATTENTE,
            created_at=utc_now() - timedelta(minutes=10),
            started_at=utc_now() - timedelta(minutes=8),
        )

        session.add_all([run_success, run_failed_gates, run_pending_val, run_running])
        await session.flush()

        # Événements et artefacts pour Run 1
        ev1 = RunEvent(
            id=uuid.uuid4(),
            run_id=run_success.id,
            from_state="QUEUED",
            to_state="PREPARING",
            cause="Attribution à l'agent de tir runner-01",
            timestamp=run_success.created_at + timedelta(seconds=10),
        )
        ev2 = RunEvent(
            id=uuid.uuid4(),
            run_id=run_success.id,
            from_state="PREPARING",
            to_state="RUNNING",
            cause="Démarrage du processus JMeter avec 200 threads",
            timestamp=run_success.started_at,
        )
        ev3 = RunEvent(
            id=uuid.uuid4(),
            run_id=run_success.id,
            from_state="RUNNING",
            to_state="FINISHED",
            cause="Fin normale du tir, évaluation des Quality Gates concluante",
            timestamp=run_success.finished_at,
        )
        param1 = RunParam(
            id=uuid.uuid4(),
            run_id=run_success.id,
            key="threads",
            value="200",
            is_secret_ref=False,
        )
        param2 = RunParam(
            id=uuid.uuid4(),
            run_id=run_success.id,
            key="duration_sec",
            value="900",
            is_secret_ref=False,
        )
        art_jtl = Artifact(
            id=uuid.uuid4(),
            run_id=run_success.id,
            artifact_type="jtl",
            object_path=f"runs/{run_success.id}/results.jtl",
            sha256_hash="d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
            size_bytes=1048576,
        )
        art_html = Artifact(
            id=uuid.uuid4(),
            run_id=run_success.id,
            artifact_type="html_report",
            object_path=f"runs/{run_success.id}/dashboard.html",
            sha256_hash="9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
            size_bytes=524288,
        )
        session.add_all([ev1, ev2, ev3, param1, param2, art_jtl, art_html])

        # 7. Audit Log initial
        audit1 = AuditLog(
            id=uuid.uuid4(),
            timestamp=utc_now() - timedelta(days=30),
            actor="admin@odace.fr",
            action="CREATE_PROJECT",
            object_type="Project",
            object_id=str(proj_facturation.id),
            details={"project_name": proj_facturation.name, "team": proj_facturation.team},
        )
        audit2 = AuditLog(
            id=uuid.uuid4(),
            timestamp=run_success.validated_at,
            actor="techlead@odace.fr",
            action="VALIDATE_RUN",
            object_type="Run",
            object_id=str(run_success.id),
            details={"validation": "APPROUVE", "comment": run_success.validation_comment},
        )
        audit3 = AuditLog(
            id=uuid.uuid4(),
            timestamp=run_failed_gates.validated_at,
            actor="techlead@odace.fr",
            action="VALIDATE_RUN",
            object_type="Run",
            object_id=str(run_failed_gates.id),
            details={"validation": "REJETE", "comment": run_failed_gates.validation_comment},
        )
        session.add_all([audit1, audit2, audit3])

        await session.commit()
        print("✅ Données de seed insérées avec succès dans PostgreSQL !")


if __name__ == "__main__":
    asyncio.run(seed())
