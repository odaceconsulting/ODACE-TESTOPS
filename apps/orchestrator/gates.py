"""
Moteur de calcul de verdict des Quality Gates.
Distingue seuils bloquants, seuils informatifs et saturation de l'injecteur.
"""

from typing import List
from libs.contracts.connectors import NormalizedResult
from libs.domain.enums import RunResult
from libs.persistence.models import Threshold


class QualityGateEngine:
    def evaluate(
        self,
        result: NormalizedResult,
        thresholds: List[Threshold],
    ) -> tuple[RunResult, List[str]]:
        """
        Évalue les métriques normalisées par rapport aux seuils configurés.
        Retourne (RunResult, justifications).
        """
        # 1. Règle RG8 : Si le générateur est saturé, NON_FIABLE direct
        if result.generator_saturated:
            return RunResult.NON_FIABLE, ["Saturation de l'injecteur détectée (CPU, GC ou débit dégradé)."]

        reasons: List[str] = []
        has_blocking_failure = False
        has_informative_alert = False

        metrics = result.metrics

        for th in thresholds:
            actual_val = None
            if th.metric_name == "p95_ms":
                actual_val = metrics.p95_ms
            elif th.metric_name == "p99_ms":
                actual_val = metrics.p99_ms
            elif th.metric_name == "error_rate":
                actual_val = metrics.error_rate_pct
            elif th.metric_name == "throughput":
                actual_val = metrics.throughput_rps

            if actual_val is None:
                continue

            passed = True
            if th.operator == "<=" and actual_val > th.target_value:
                passed = False
            elif th.operator == ">=" and actual_val < th.target_value:
                passed = False
            elif th.operator == "<" and actual_val >= th.target_value:
                passed = False
            elif th.operator == ">" and actual_val <= th.target_value:
                passed = False

            if not passed:
                msg = f"Seuil non respecté : {th.metric_name} = {actual_val} ({th.operator} {th.target_value})"
                reasons.append(msg)
                if th.is_blocking:
                    has_blocking_failure = True
                else:
                    has_informative_alert = True

        if has_blocking_failure:
            return RunResult.NON_CONFORME, reasons
        elif has_informative_alert:
            return RunResult.INFORMATIF, reasons
        else:
            return RunResult.CONFORME, ["Tous les critères de qualité sont validés."]
