"""
Connecteur Echo de démonstration et de validation de chaîne.
Permet d'exécuter un test factice rapide pour valider l'orchestration,
les événements et la remontée d'artefacts sans nécessiter JMeter ou un navigateur.
"""

from pathlib import Path
from typing import List
from libs.contracts.connectors import CommandSpec, NormalizedResult, Problem, RunSpec, SampleMetric
from libs.domain.enums import TestTool


class EchoConnector:
    kind: str = "echo"

    def validate(self, spec: RunSpec) -> List[Problem]:
        # Pas d'anomalie particulière pour le connecteur echo
        return []

    def prepare(self, spec: RunSpec, workdir: Path) -> CommandSpec:
        workdir.mkdir(parents=True, exist_ok=True)
        # Génère un script shell / python simple qui écrit un fichier de résultat
        script_file = workdir / "run_echo.py"
        script_file.write_text(
            "import time\n"
            "print('Echo Test démarré...')\n"
            "time.sleep(1)\n"
            "with open('summary.txt', 'w') as f:\n"
            "    f.write('OK - Echo run finished\\n')\n"
            "print('Echo Test terminé.')\n",
            encoding="utf-8"
        )
        return CommandSpec(
            args=["python", str(script_file)],
            workdir=workdir,
            env={"ECHO_TARGET": spec.target_url}
        )

    def parse(self, workdir: Path) -> NormalizedResult:
        summary_file = workdir / "summary.txt"
        success = summary_file.exists() and "OK" in summary_file.read_text(encoding="utf-8")
        return NormalizedResult(
            tool=TestTool.ECHO,
            raw_status="SUCCESS" if success else "FAILURE",
            metrics=SampleMetric(
                p50_ms=12.0,
                p95_ms=18.0,
                p99_ms=25.0,
                avg_ms=14.0,
                throughput_rps=50.0,
                error_rate_pct=0.0,
                total_samples=100,
                failed_samples=0,
                flaky_count=0
            ),
            generator_saturated=False,
            evidence_files=["summary.txt"] if success else []
        )

    def artifacts(self, workdir: Path) -> List[Path]:
        files: List[Path] = []
        for name in ["summary.txt", "run_echo.py"]:
            p = workdir / name
            if p.exists():
                files.append(p)
        return files

    def stop(self, handle: str, grace_s: int = 5) -> None:
        pass
