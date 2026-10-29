"""
Parser de fichiers de résultats JMeter (.jtl / CSV) en flux avec mémoire bornée.
Calcule les centiles p50, p90, p95, p99, le débit et le taux d'erreur.
"""

import csv
from pathlib import Path
from typing import Generator, List, Optional
from libs.contracts.connectors import SampleMetric


class JTLRecord:
    __slots__ = ("timestamp", "elapsed_ms", "label", "response_code", "success")

    def __init__(self, timestamp: int, elapsed_ms: float, label: str, response_code: str, success: bool):
        self.timestamp = timestamp
        self.elapsed_ms = elapsed_ms
        self.label = label
        self.response_code = response_code
        self.success = success


class JTLStreamParser:
    """Analyse les fichiers JTL en flux continu sans charger l'intégralité du fichier en RAM."""

    def __init__(self, max_samples_for_percentiles: int = 50_000):
        self.max_samples = max_samples_for_percentiles

    def stream_records(self, jtl_path: Path) -> Generator[JTLRecord, None, None]:
        """Générateur lisant le fichier CSV ligne à ligne."""
        with open(jtl_path, "r", encoding="utf-8", errors="replace", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    ts = int(row.get("timeStamp", 0))
                    elapsed = float(row.get("elapsed", 0))
                    label = row.get("label", "")
                    code = row.get("responseCode", "200")
                    success = row.get("success", "true").lower() == "true"
                    yield JTLRecord(ts, elapsed, label, code, success)
                except (ValueError, KeyError):
                    continue

    def parse(self, jtl_path: Path) -> SampleMetric:
        """Parcourt le fichier JTL et synthétise les métriques globales."""
        if not jtl_path.exists():
            return SampleMetric()

        total = 0
        failed = 0
        sum_elapsed = 0.0
        min_ts: Optional[int] = None
        max_ts: Optional[int] = None

        # Échantillonnage pour le calcul des centiles (réservoir si fichier énorme)
        latencies: List[float] = []

        for record in self.stream_records(jtl_path):
            total += 1
            if not record.success:
                failed += 1

            sum_elapsed += record.elapsed_ms

            if min_ts is None or record.timestamp < min_ts:
                min_ts = record.timestamp
            if max_ts is None or record.timestamp > max_ts:
                max_ts = record.timestamp

            # Stockage borné pour calcul des centiles
            if len(latencies) < self.max_samples:
                latencies.append(record.elapsed_ms)
            else:
                # Échantillonnage de réservoir simple
                import random
                idx = random.randint(0, total)
                if idx < self.max_samples:
                    latencies[idx] = record.elapsed_ms

        if total == 0:
            return SampleMetric()

        latencies.sort()
        n = len(latencies)

        def get_percentile(p: float) -> float:
            k = (n - 1) * (p / 100.0)
            f = int(k)
            c = min(f + 1, n - 1)
            d = k - f
            return round(latencies[f] + d * (latencies[c] - latencies[f]), 2)

        # Calcul de la durée du tir en secondes
        duration_s = 1.0
        if min_ts is not None and max_ts is not None and max_ts > min_ts:
            duration_s = max((max_ts - min_ts) / 1000.0, 1.0)

        throughput = round(total / duration_s, 2)
        error_rate = round((failed / total) * 100.0, 2)
        avg = round(sum_elapsed / total, 2)

        return SampleMetric(
            total_samples=total,
            failed_samples=failed,
            avg_ms=avg,
            p50_ms=get_percentile(50.0),
            p90_ms=get_percentile(90.0),
            p95_ms=get_percentile(95.0),
            p99_ms=get_percentile(99.0),
            throughput_rps=throughput,
            error_rate_pct=error_rate,
            flaky_count=0,
        )
