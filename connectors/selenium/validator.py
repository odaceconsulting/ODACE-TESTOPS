"""
Validateur préalable des suites de tests fonctionnels Selenium.
Règle d'or : Selenium vérifie des parcours fonctionnels IHM, il ne mesure PAS
la performance sous charge. Tout paramètre de montée en charge est formellement refusé.
"""

from pathlib import Path
from typing import List
from libs.contracts.connectors import Problem, RunSpec


class SeleniumSuiteValidator:
    """Valide la suite de tests fonctionnels Selenium avant exécution."""

    FORBIDDEN_LOAD_PARAMS = {
        "threads",
        "num_threads",
        "users",
        "virtual_users",
        "vu",
        "concurrency",
        "rps",
        "rate",
        "rampup",
        "ramp_time",
    }

    def validate_suite(self, spec: RunSpec) -> List[Problem]:
        problems: List[Problem] = []

        # 1. RÈGLE D'OR : Refus formel de montée en charge
        for param_key, param_value in spec.public_params.items():
            if param_key.lower() in self.FORBIDDEN_LOAD_PARAMS:
                try:
                    val_int = int(param_value)
                    if val_int > 1:
                        problems.append(
                            Problem(
                                code="LOAD_INJECTION_FORBIDDEN",
                                message=(
                                    f"Le paramètre de charge '{param_key}={param_value}' est strictement interdit pour Selenium. "
                                    "Selenium vérifie des parcours fonctionnels unitaires (1 navigateur à la fois) "
                                    "et ne doit jamais être utilisé comme injecteur de charge."
                                ),
                                severity="ERROR",
                            )
                        )
                except (ValueError, TypeError):
                    problems.append(
                        Problem(
                            code="LOAD_PARAM_NOT_ALLOWED",
                            message=f"Le paramètre '{param_key}' n'est pas autorisé pour le connecteur fonctionnel Selenium.",
                            severity="ERROR",
                        )
                    )

        # 2. Vérification de l'existence de l'asset
        asset_path = spec.asset_path
        if not asset_path.exists():
            problems.append(
                Problem(
                    code="ASSET_FILE_NOT_FOUND",
                    message=f"Le fichier de script ou suite Selenium '{asset_path}' est introuvable.",
                    severity="ERROR",
                )
            )
            return problems

        # 3. Vérification de l'extension
        valid_extensions = {".py", ".side", ".zip", ".tar.gz"}
        if asset_path.suffix.lower() not in valid_extensions:
            problems.append(
                Problem(
                    code="INVALID_ASSET_TYPE",
                    message=(
                        f"Extension '{asset_path.suffix}' non supportée pour Selenium. "
                        f"Extensions attendues : {', '.join(valid_extensions)}"
                    ),
                    severity="ERROR",
                )
            )

        # 4. Vérification du contenu (anti-fuite de secrets et chemins absolus)
        if asset_path.suffix.lower() == ".py":
            try:
                content = asset_path.read_text(encoding="utf-8", errors="ignore")
                for line_idx, line in enumerate(content.splitlines(), start=1):
                    # Chemins absolus suspects Windows ou Unix
                    if ("C:\\" in line or "D:\\" in line or "/home/" in line or "/Users/" in line) and "import" not in line:
                        problems.append(
                            Problem(
                                code="ABSOLUTE_PATH_DETECTED",
                                message=f"Ligne {line_idx} : Chemin absolu détecté dans le script Selenium : '{line.strip()[:60]}...'. Les chemins relatifs sont obligatoires.",
                                severity="ERROR",
                            )
                        )
            except Exception as e:
                problems.append(
                    Problem(
                        code="ASSET_READ_ERROR",
                        message=f"Impossible de lire le fichier de script : {str(e)}",
                        severity="ERROR",
                    )
                )

        return problems
