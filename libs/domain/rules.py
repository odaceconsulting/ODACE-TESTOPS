"""
Règles métier pures du domaine ODACE TestOps.
Ne contient aucune dépendance technique (base de données, HTTP, etc.).
"""

from typing import Set
from libs.domain.enums import RunState, RunResult


class IllegalTransitionError(Exception):
    """Levée lorsqu'une transition d'état d'exécution est interdite."""
    def __init__(self, current_state: RunState, target_state: RunState):
        super().__init__(f"Transition illégale : {current_state.value} -> {target_state.value}")
        self.current_state = current_state
        self.target_state = target_state


# Matrice officielle des transitions autorisées (Source : Guide Développeur Étape 3)
ALLOWED_TRANSITIONS: dict[RunState, Set[RunState]] = {
    RunState.QUEUED: {RunState.DISPATCHED, RunState.CANCELLED},
    RunState.DISPATCHED: {RunState.RUNNING, RunState.CANCELLED, RunState.INDETERMINATE},
    RunState.RUNNING: {RunState.FINISHED, RunState.FAILED, RunState.CANCELLED, RunState.INDETERMINATE},
    # États terminaux : aucune transition possible sauf clôture manuelle d'un indéterminé
    RunState.FINISHED: set(),
    RunState.FAILED: set(),
    RunState.CANCELLED: set(),
    RunState.INDETERMINATE: {RunState.CANCELLED},  # Clôture manuelle uniquement
}


def validate_transition(current: RunState, target: RunState) -> None:
    """Vérifie si une transition d'état est permise par la machine à états."""
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise IllegalTransitionError(current, target)


def is_generator_saturated(
    cpu_percent_p95: float,
    gc_pause_ms_p95: float,
    achieved_rps: float,
    target_rps: float,
    cpu_limit: float = 80.0,
    gc_pause_limit_ms: float = 500.0,
    rps_ratio_min: float = 0.90,
) -> bool:
    """
    Règle RG8 : Détecte si l'injecteur de charge a saturé.
    Si le processeur a dépassé 80%, ou les pauses GC > 500ms,
    ou si le débit obtenu est inférieur à 90% du débit visé,
    alors le générateur est considéré comme saturé.
    """
    if cpu_percent_p95 > cpu_limit:
        return True
    if gc_pause_ms_p95 > gc_pause_limit_ms:
        return True
    if target_rps > 0 and (achieved_rps < rps_ratio_min * target_rps):
        return True
    return False
