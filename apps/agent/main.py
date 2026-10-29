"""
Démon d'exécution Agent ODACE TestOps.
Reçoit les ordres, charge le bon connecteur, lance le conteneur Docker et remonte les preuves.
"""

import asyncio
import logging
from pathlib import Path
from connectors.echo.connector import EchoConnector
from connectors.jmeter.connector import JMeterConnector
from libs.contracts.connectors import RunSpec
from libs.domain.enums import TestTool

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("odace.agent")


class TestAgent:
    def __init__(self, agent_id: str, work_base_dir: Path):
        self.agent_id = agent_id
        self.work_base_dir = work_base_dir
        self.connectors = {
            TestTool.ECHO.value: EchoConnector(),
            TestTool.JMETER.value: JMeterConnector(),
        }

    async def run_execution(self, spec: RunSpec):
        logger.info("Début de traitement de l'exécution %s (outil: %s)", spec.run_id, spec.tool.value)
        connector = self.connectors.get(spec.tool.value)
        if not connector:
            raise ValueError(f"Connecteur inconnu : {spec.tool.value}")

        workdir = self.work_base_dir / spec.run_id
        workdir.mkdir(parents=True, exist_ok=True)

        # 1. Validation préalable
        problems = connector.validate(spec)
        if problems:
            logger.error("Validation échouée : %s", problems)
            return

        # 2. Préparation de la commande
        cmd = connector.prepare(spec, workdir)
        logger.info("Commande préparée : %s", " ".join(cmd.args))

        # 3. Exécution (ici simulée ou via Docker runtime)
        proc = await asyncio.create_subprocess_exec(
            *cmd.args,
            cwd=cmd.workdir,
            env=cmd.env,
        )
        await proc.wait()

        # 4. Parse des résultats
        results = connector.parse(workdir)
        logger.info("Résultats extraits : %s (débit: %s req/s)", results.raw_status, results.metrics.throughput_rps)

        # 5. Déclaration des artefacts
        artifacts = connector.artifacts(workdir)
        logger.info("Artefacts prêts pour envoi MinIO : %s", [a.name for a in artifacts])


if __name__ == "__main__":
    agent = TestAgent("agent-local-01", Path("/tmp/odace-agent-work"))
    logger.info("Agent ODACE démarré avec succès.")
