"""
Connecteur officiel Selenium pour ODACE TestOps.
Exécute des suites de parcours fonctionnels IHM dans un conteneur headless,
gère la nouvelle tentative unique (détection d'instabilité) et collecte les preuves d'audit.
"""

from pathlib import Path
from typing import List
from connectors.selenium.junit_parser import JUnitReportParser
from connectors.selenium.validator import SeleniumSuiteValidator
from libs.contracts.connectors import CommandSpec, NormalizedResult, Problem, RunSpec
from libs.domain.enums import TestTool


class SeleniumConnector:
    """Connecteur universel pour les suites fonctionnelles Selenium."""
    kind: str = "selenium"

    def __init__(self):
        self.validator = SeleniumSuiteValidator()
        self.parser = JUnitReportParser()

    def validate(self, spec: RunSpec) -> List[Problem]:
        """
        1. Valide la demande avant tout lancement en conteneur.
        Refuse formellement tout paramètre de charge et vérifie la suite.
        """
        return self.validator.validate_suite(spec)

    def prepare(self, spec: RunSpec, workdir: Path) -> CommandSpec:
        """
        2. Prépare l'environnement d'exécution et construit la commande CLI.
        Active la tentative de rejeu unique (--reruns 1) pour détecter les tests instables.
        """
        workdir.mkdir(parents=True, exist_ok=True)
        junit_xml = workdir / "report.xml"
        screenshots_dir = workdir / "screenshots"
        screenshots_dir.mkdir(parents=True, exist_ok=True)

        args = [
            "pytest",
            str(spec.asset_path),
            "-q",
            f"--junitxml={str(junit_xml)}",
            "--reruns", "1",
            "--reruns-delay", "2",
            f"--screenshot-dir={str(screenshots_dir)}",
        ]

        # Injection des paramètres publics comme variables ou options pytest
        for k, v in spec.public_params.items():
            args.append(f"-o")
            args.append(f"{k}={v}")

        # Les variables d'environnement passent l'URL cible et les secrets
        env = {
            "TARGET_URL": spec.target_url,
            "HEADLESS": "true",
            "SELENIUM_SCREENSHOT_DIR": str(screenshots_dir),
            **spec.secret_env_refs,
        }

        return CommandSpec(
            args=args,
            workdir=workdir,
            env=env,
        )

    def parse(self, workdir: Path) -> NormalizedResult:
        """
        3. Lit le rapport JUnit XML généré, normalise les 4 statuts
        et indexe les captures d'écran comme preuves d'audit.
        """
        junit_xml = workdir / "report.xml"
        metrics, cases, breakdown = self.parser.parse(junit_xml)

        evidence_names = [f.name for f in self.artifacts(workdir)]

        # Détermination du statut brut
        if metrics.failed_samples > 0:
            raw_status = "FAILURES_DETECTED"
        elif metrics.flaky_count > 0:
            raw_status = "FLAKY_DETECTED"
        else:
            raw_status = "SUCCESS"

        return NormalizedResult(
            tool=TestTool.SELENIUM,
            raw_status=raw_status,
            metrics=metrics,
            generator_saturated=False,  # Selenium ne mesure pas la saturation de charge
            evidence_files=evidence_names,
            details=breakdown,
        )

    def artifacts(self, workdir: Path) -> List[Path]:
        """
        4. Identifie toutes les preuves à archiver dans le stockage d'audit MinIO
        (rapport XML, journal de console et captures d'écran d'échecs).
        """
        found: List[Path] = []

        report_file = workdir / "report.xml"
        if report_file.exists():
            found.append(report_file)

        log_file = workdir / "pytest.log"
        if log_file.exists():
            found.append(log_file)

        screenshots_dir = workdir / "screenshots"
        if screenshots_dir.exists() and screenshots_dir.is_dir():
            for shot in screenshots_dir.glob("*.png"):
                found.append(shot)

        return found

    def stop(self, handle: str, grace_s: int = 10) -> None:
        """5. Arrêt propre du conteneur du navigateur."""
        pass
