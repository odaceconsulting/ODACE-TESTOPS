"""
Connecteur officiel Apache JMeter pour ODACE TestOps.
Implémente le contrat universel Connector (5 méthodes).
"""

import json
from pathlib import Path
from typing import List
from connectors.jmeter.jtl_parser import JTLStreamParser
from connectors.jmeter.saturation import GeneratorSaturationDetector, GeneratorStats
from connectors.jmeter.validator import JMeterPlanValidator
from libs.contracts.connectors import CommandSpec, NormalizedResult, Problem, RunSpec
from libs.domain.enums import TestTool


class JMeterConnector:
    kind: str = "jmeter"

    def __init__(self):
        self.validator = JMeterPlanValidator()
        self.jtl_parser = JTLStreamParser()
        self.saturation_detector = GeneratorSaturationDetector()

    def validate(self, spec: RunSpec) -> List[Problem]:
        """1. Valide le plan JMX avant tout lancement en conteneur."""
        return self.validator.validate_plan(spec)

    def prepare(self, spec: RunSpec, workdir: Path) -> CommandSpec:
        """
        2. Prépare la ligne de commande CLI headless.
        Injecte les paramètres publics via -J et prépare les sorties JTL + HTML.
        """
        workdir.mkdir(parents=True, exist_ok=True)
        results_jtl = workdir / "results.jtl"
        report_dir = workdir / "report"

        args = [
            "jmeter",
            "-n",  # Mode non graphique obligatoire
            "-t", str(spec.asset_path),
            "-l", str(results_jtl),
            "-e",  # Génération du rapport dashboard HTML
            "-o", str(report_dir),
        ]

        # Injection des paramètres non secrets sous forme -Jcle=valeur
        for k, v in spec.public_params.items():
            args.append(f"-J{k}={v}")

        # Les secrets sont passés par variables d'environnement, jamais en clair en ligne de commande
        return CommandSpec(
            args=args,
            workdir=workdir,
            env=spec.secret_env_refs,
        )

    def parse(self, workdir: Path) -> NormalizedResult:
        """
        3. Lit les résultats produits (fichier results.jtl en flux).
        Détecte également si le générateur a saturé.
        """
        results_jtl = workdir / "results.jtl"
        metrics = self.jtl_parser.parse(results_jtl)

        # Vérification d'éventuelles stats du générateur
        stats_file = workdir / "generator_stats.json"
        is_saturated = False
        details = {}

        if stats_file.exists():
            try:
                data = json.loads(stats_file.read_text(encoding="utf-8"))
                stats = GeneratorStats(**data)
                is_saturated, reasons = self.saturation_detector.is_saturated(stats)
                details["saturation_reasons"] = reasons
            except Exception:
                pass

        evidence_names = [f.name for f in self.artifacts(workdir)]

        return NormalizedResult(
            tool=TestTool.JMETER,
            raw_status="SUCCESS" if metrics.failed_samples == 0 else "FAILURES_DETECTED",
            metrics=metrics,
            generator_saturated=is_saturated,
            evidence_files=evidence_names,
            details=details,
        )

    def artifacts(self, workdir: Path) -> List[Path]:
        """4. Identifie les fichiers et rapports à archiver dans MinIO."""
        found: List[Path] = []
        for name in ["results.jtl", "jmeter.log", "generator_stats.json"]:
            p = workdir / name
            if p.exists():
                found.append(p)

        report_dir = workdir / "report"
        if report_dir.exists() and report_dir.is_dir():
            # Si le rapport HTML complet existe, on l'inclut
            index_html = report_dir / "index.html"
            if index_html.exists():
                found.append(index_html)

        return found

    def stop(self, handle: str, grace_s: int = 10) -> None:
        """5. Arrêt propre du tir de charge JMeter."""
        # Dans un conteneur Docker, cela correspond à docker stop -t {grace_s} {handle}
        pass
