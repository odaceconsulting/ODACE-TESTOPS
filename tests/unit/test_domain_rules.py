"""
Tests unitaires des règles de gestion pures du domaine ODACE TestOps.
"""

import pytest
from libs.domain.enums import RunState, RunResult
from libs.domain.rules import (
    IllegalTransitionError,
    is_generator_saturated,
    validate_transition,
)


def test_allowed_transitions():
    # Queued -> Dispatched : OK
    validate_transition(RunState.QUEUED, RunState.DISPATCHED)
    # Dispatched -> Running : OK
    validate_transition(RunState.DISPATCHED, RunState.RUNNING)
    # Running -> Finished : OK
    validate_transition(RunState.RUNNING, RunState.FINISHED)
    # Running -> Indeterminate (perte de contact) : OK
    validate_transition(RunState.RUNNING, RunState.INDETERMINATE)


def test_forbidden_transitions():
    # Un test en file ne peut pas sauter directement à terminé
    with pytest.raises(IllegalTransitionError):
        validate_transition(RunState.QUEUED, RunState.FINISHED)

    # Un test terminé est terminal : aucune transition autorisée
    with pytest.raises(IllegalTransitionError):
        validate_transition(RunState.FINISHED, RunState.RUNNING)

    # Un test indéterminé ne peut JAMAIS être relancé automatiquement vers RUNNING
    with pytest.raises(IllegalTransitionError):
        validate_transition(RunState.INDETERMINATE, RunState.RUNNING)


def test_generator_saturation_detection():
    # Cas normal : CPU 45%, GC 120ms, débit 100%
    assert not is_generator_saturated(
        cpu_percent_p95=45.0,
        gc_pause_ms_p95=120.0,
        achieved_rps=100.0,
        target_rps=100.0,
    )

    # Cas CPU saturé (> 80%) -> non fiable
    assert is_generator_saturated(
        cpu_percent_p95=85.0,
        gc_pause_ms_p95=120.0,
        achieved_rps=100.0,
        target_rps=100.0,
    )

    # Cas Pauses GC excessives (> 500ms) -> non fiable
    assert is_generator_saturated(
        cpu_percent_p95=50.0,
        gc_pause_ms_p95=620.0,
        achieved_rps=100.0,
        target_rps=100.0,
    )

    # Cas débit obtenu en chute libre (< 90% du débit cible) -> non fiable
    assert is_generator_saturated(
        cpu_percent_p95=50.0,
        gc_pause_ms_p95=100.0,
        achieved_rps=75.0,
        target_rps=100.0,
    )
