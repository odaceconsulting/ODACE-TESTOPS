"""
Surveillance de la santé du générateur de charge (injecteur).
Implémente la règle d'or RG8 : détection de saturation processeur, mémoire/GC ou débit.
"""

from pydantic import BaseModel


class GeneratorStats(BaseModel):
    """Métriques collectées sur l'hôte ou le conteneur du générateur pendant le tir."""
    cpu_percent_p95: float = 0.0
    gc_pause_ms_p95: float = 0.0
    target_rps: float = 0.0
    achieved_rps: float = 0.0
    memory_percent_p95: float = 0.0


class GeneratorSaturationDetector:
    """Détecte si les performances mesurées sont faussées par la surcharge du générateur lui-même."""

    def __init__(
        self,
        cpu_threshold: float = 80.0,
        gc_pause_threshold_ms: float = 500.0,
        rps_ratio_min: float = 0.90,
    ):
        self.cpu_threshold = cpu_threshold
        self.gc_pause_threshold_ms = gc_pause_threshold_ms
        self.rps_ratio_min = rps_ratio_min

    def is_saturated(self, stats: GeneratorStats) -> tuple[bool, list[str]]:
        reasons: list[str] = []

        if stats.cpu_percent_p95 > self.cpu_threshold:
            reasons.append(
                f"Processeur de l'injecteur saturé : p95 à {stats.cpu_percent_p95}% (seuil max: {self.cpu_threshold}%)"
            )

        if stats.gc_pause_ms_p95 > self.gc_pause_threshold_ms:
            reasons.append(
                f"Pauses de ramasse-miettes JVM excessives : p95 à {stats.gc_pause_ms_p95}ms (seuil max: {self.gc_pause_threshold_ms}ms)"
            )

        if stats.target_rps > 0 and (stats.achieved_rps < self.rps_ratio_min * stats.target_rps):
            reasons.append(
                f"Débit d'injection dégradé : {stats.achieved_rps} req/s obtenus pour {stats.target_rps} req/s visés (< 90%)"
            )

        return (len(reasons) > 0, reasons)
