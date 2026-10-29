"""
Validation préalable des plans de test Apache JMeter (.jmx).
Vérifie la sécurité, les chemins absolus et les quotas de threads avant tout tir.
"""

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List
from libs.contracts.connectors import Problem, RunSpec


class JMeterPlanValidator:
    """Valide la structure et le contenu d'un plan JMX avant tout lancement en conteneur."""

    FORBIDDEN_PATH_PREFIXES = ["C:\\", "D:\\", "/home/", "/root/", "/tmp/", "\\\\"]

    def validate_plan(self, spec: RunSpec) -> List[Problem]:
        problems: List[Problem] = []
        path = spec.asset_path

        if not path.exists():
            problems.append(
                Problem(
                    code="ASSET_NOT_FOUND",
                    message=f"Le fichier de plan JMeter '{path.name}' est introuvable sur le disque.",
                    severity="ERROR",
                )
            )
            return problems

        if path.suffix.lower() != ".jmx":
            problems.append(
                Problem(
                    code="INVALID_EXTENSION",
                    message=f"Extension invalide '{path.suffix}'. JMeter requiert un fichier '.jmx'.",
                    severity="ERROR",
                )
            )
            return problems

        try:
            tree = ET.parse(path)
            root = tree.getroot()
        except ET.ParseError as e:
            problems.append(
                Problem(
                    code="XML_SYNTAX_ERROR",
                    message=f"Le fichier JMX n'est pas un XML valide : {e}",
                    severity="ERROR",
                )
            )
            return problems

        # 1. Vérification des chemins absolus (ex: dans les CSVDataSet)
        for elem in root.iter():
            text = elem.text or ""
            for forbidden in self.FORBIDDEN_PATH_PREFIXES:
                if forbidden in text:
                    problems.append(
                        Problem(
                            code="ABSOLUTE_PATH_DETECTED",
                            message=f"Chemin absolu interdit détecté dans l'élément <{elem.tag}> : '{text}'. Utilisez des chemins relatifs.",
                            severity="ERROR",
                        )
                    )

        # 2. Vérification des quotas de threads
        target_max = spec.target_max_threads
        requested_threads = int(spec.public_params.get("threads", spec.public_params.get("vusers", 0)))
        if requested_threads > target_max:
            problems.append(
                Problem(
                    code="MAX_THREADS_EXCEEDED",
                    message=f"Le nombre de threads demandé ({requested_threads}) dépasse le quota autorisé pour la cible ({target_max}).",
                    severity="ERROR",
                )
            )

        # 3. Vérification des secrets en clair (détection de mots de passe triviaux en dur)
        for elem in root.iter():
            name_attr = elem.attrib.get("name", "").lower()
            if "password" in name_attr or "secret" in name_attr or "pwd" in name_attr:
                val = elem.text or ""
                # Si la valeur n'est pas une variable dynamique ${...}
                if val and not (val.startswith("${") and val.endswith("}")):
                    problems.append(
                        Problem(
                            code="PLAINTEXT_SECRET_DETECTED",
                            message=f"Secret suspect en clair dans le paramètre '{name_attr}'. Utilisez une référence de coffre ou une variable -J.",
                            severity="WARNING",
                        )
                    )

        return problems
