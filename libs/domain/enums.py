"""
Énumérations fondamentales du domaine ODACE TestOps.
Respecte scrupuleusement les 3 dimensions de verdict et les 7 rôles.
"""

from enum import Enum


class RunState(str, Enum):
    """Dimension 1 : État technique d'exécution piloté par l'orchestrateur."""
    QUEUED = "QUEUED"                    # En file, attente d'un agent/cible libre
    DISPATCHED = "DISPATCHED"            # Ordre transmis à l'agent
    RUNNING = "RUNNING"                  # En cours d'exécution dans le conteneur
    FINISHED = "FINISHED"                # Exécution achevée normalement (verdict à évaluer)
    FAILED = "FAILED"                    # Échec technique d'exécution
    CANCELLED = "CANCELLED"              # Arrêt demandé par l'utilisateur ou Kill Switch
    INDETERMINATE = "INDETERMINATE"      # Perte de contact agent / crash ; clôture manuelle


class RunResult(str, Enum):
    """Dimension 2 : Résultat calculé par le Quality Gate."""
    CONFORME = "CONFORME"                # Tous les seuils bloquants sont respectés
    NON_CONFORME = "NON_CONFORME"        # Au moins un seuil bloquant est dépassé
    INFORMATIF = "INFORMATIF"            # Seuils informatifs seulement ou écart mineur
    NON_FIABLE = "NON_FIABLE"            # Générateur saturé : mesure inexploitable


class HumanValidation(str, Enum):
    """Dimension 3 : Décision humaine du Tech Lead."""
    EN_ATTENTE = "EN_ATTENTE"            # En attente de revue
    VALIDE = "VALIDE"                    # Accepté par le responsable
    REFUSE = "REFUSE"                    # Rejeté par le responsable


class UserRole(str, Enum):
    """Les 7 rôles définis dans le DAFT et la note de cadrage."""
    ADMIN = "admin"                      # Paramétrage global, sécurité, arrêt d'urgence
    RESPONSABLE = "responsable"          # Équipes, projets, quotas
    TECH_LEAD = "tech_lead"              # Seuils bloquants, validation des résultats
    DEVELOPER = "developer"              # Consultation, lancement sur cibles autorisées
    TESTER = "tester"                    # Gestion scripts, campagnes, annulations
    EXPLOITATION = "exploitation"        # Surveillance agents, arrêt d'urgence
    AUDITOR = "auditor"                  # Lecture seule et export des preuves


class TestTool(str, Enum):
    """Types d'outils de test supportés."""
    ECHO = "echo"                        # Connecteur factice de validation
    JMETER = "jmeter"                    # Performance et charge
    SELENIUM = "selenium"                # Parcours fonctionnels IHM
    PLAYWRIGHT = "playwright"            # Extension parcours moderne
    API_TEST = "api_test"                # Suites de tests d'API


class EnvironmentType(str, Enum):
    """Types d'environnements."""
    DEV = "DEV"
    RECETTE = "RECETTE"
    PREPROD = "PREPROD"
    PROD = "PROD"
