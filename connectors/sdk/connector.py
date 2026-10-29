"""
SDK Connecteur universel ODACE TestOps.
Définit le contrat strict que chaque connecteur d'outil doit respecter.
"""

from pathlib import Path
from typing import List, Protocol
from libs.contracts.connectors import CommandSpec, NormalizedResult, Problem, RunSpec


class Connector(Protocol):
    """
    Contrat universel de connecteur de test (5 méthodes).
    Tout moteur (JMeter, Selenium, Playwright, Newman, Echo) implémente cette interface.
    """
    kind: str

    def validate(self, spec: RunSpec) -> List[Problem]:
        """
        1. Valide la demande avant tout lancement en conteneur.
        Vérifie la compatibilité de version, l'absence de secrets en clair,
        l'absence de chemins absolus et le respect des capacités cibles.
        """
        ...

    def prepare(self, spec: RunSpec, workdir: Path) -> CommandSpec:
        """
        2. Prépare les fichiers et construit la ligne de commande CLI.
        Injecte les paramètres non secrets et les références de coffre.
        """
        ...

    def parse(self, workdir: Path) -> NormalizedResult:
        """
        3. Lit les résultats produits (ex: JTL en flux ou JUnit XML).
        Normalise les centiles, erreurs et taux de succès.
        """
        ...

    def artifacts(self, workdir: Path) -> List[Path]:
        """
        4. Identifie les fichiers à conserver et téléverser dans MinIO
        (rapports HTML, synthèses CSV, captures d'écrans, journaux).
        """
        ...

    def stop(self, handle: str, grace_s: int = 10) -> None:
        """
        5. Gère l'arrêt propre du processus ou du conteneur en cours
        (SIGTERM puis délai de grâce puis SIGKILL forcé).
        """
        ...
