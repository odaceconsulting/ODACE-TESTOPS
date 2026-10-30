"""
Tests unitaires pour l'Étape 7 : Quality Gate et Sécurité des Webhooks HMAC (Guide Développeur).
"""

import hashlib
import hmac
import time
import pytest
from apps.api.modules.webhooks.router import verify_hmac_signature
from apps.orchestrator.gates import QualityGateEngine
from libs.contracts.connectors import NormalizedResult, SampleMetric
from libs.domain.enums import RunResult, TestTool
from libs.persistence.models import Threshold


def test_quality_gate_conforme():
    """Un tir respectant tous les seuils bloquants et informatifs doit être validé CONFORME."""
    engine = QualityGateEngine()
    metrics = SampleMetric(
        p50_ms=120.0,
        p90_ms=450.0,
        p95_ms=650.0,      # <= 800ms OK
        p99_ms=950.0,
        error_rate_pct=0.005,  # <= 0.01 OK
        throughput_rps=150.0,
    )
    result = NormalizedResult(
        tool=TestTool.JMETER,
        raw_status="OK",
        generator_saturated=False,
        metrics=metrics,
    )

    thresholds = [
        Threshold(
            project_id=None,
            environment_name="recette",
            metric_name="p95_ms",
            operator="<=",
            target_value=800.0,
            is_blocking=True,
        ),
        Threshold(
            project_id=None,
            environment_name="recette",
            metric_name="error_rate",
            operator="<=",
            target_value=0.01,
            is_blocking=True,
        ),
    ]

    verdict, reasons = engine.evaluate(result, thresholds)
    assert verdict == RunResult.CONFORME
    assert any("validés" in r for r in reasons)


def test_quality_gate_blocking_failure():
    """Un dépassement d'un seuil bloquant (ex: p95 > 800ms) doit immédiatement produire NON_CONFORME."""
    engine = QualityGateEngine()
    metrics = SampleMetric(
        p50_ms=200.0,
        p90_ms=750.0,
        p95_ms=880.0,      # > 800ms : VIOLATION BLOQUANTE
        p99_ms=1200.0,
        error_rate_pct=0.002,
        throughput_rps=120.0,
    )
    result = NormalizedResult(
        tool=TestTool.JMETER,
        raw_status="OK",
        generator_saturated=False,
        metrics=metrics,
    )

    thresholds = [
        Threshold(
            project_id=None,
            environment_name="recette",
            metric_name="p95_ms",
            operator="<=",
            target_value=800.0,
            is_blocking=True,
        ),
    ]

    verdict, reasons = engine.evaluate(result, thresholds)
    assert verdict == RunResult.NON_CONFORME
    assert any("p95_ms = 880.0" in r for r in reasons)


def test_quality_gate_generator_saturation_override():
    """RG8 : Si l'injecteur était saturé, le résultat est NON_FIABLE même si les temps sont bons."""
    engine = QualityGateEngine()
    metrics = SampleMetric(
        p50_ms=50.0,
        p90_ms=80.0,
        p95_ms=100.0,
        p99_ms=150.0,
        error_rate_pct=0.0,
        throughput_rps=50.0,
    )
    result = NormalizedResult(
        tool=TestTool.JMETER,
        raw_status="OK",
        generator_saturated=True,  # RG8 : saturation injecteur
        metrics=metrics,
    )

    verdict, reasons = engine.evaluate(result, [])
    assert verdict == RunResult.NON_FIABLE
    assert any("Saturation de l'injecteur" in r for r in reasons)


def test_webhook_hmac_valid():
    """Un webhook signé correctement avec un horodatage récent (< 300s) doit être accepté."""
    secret = "mon-super-secret-ci-cd-12345"
    now_ts = str(int(time.time()))
    body = b'{"threads": 50, "duration_sec": 30}'

    sig = hmac.new(
        secret.encode("utf-8"),
        f"{now_ts}.".encode("utf-8") + body,
        hashlib.sha256,
    ).hexdigest()

    assert verify_hmac_signature(secret, body, now_ts, sig) is True


def test_webhook_hmac_expired_timestamp_replay_attack():
    """Contrôle anti-rejeu (Guide p.23) : un horodatage de plus de 300 secondes doit être rejeté."""
    secret = "mon-super-secret-ci-cd-12345"
    expired_ts = str(int(time.time()) - 350)  # 350 secondes dans le passé (> 300s)
    body = b'{"threads": 50}'

    sig = hmac.new(
        secret.encode("utf-8"),
        f"{expired_ts}.".encode("utf-8") + body,
        hashlib.sha256,
    ).hexdigest()

    assert verify_hmac_signature(secret, body, expired_ts, sig) is False


def test_webhook_hmac_bad_signature():
    """Un corps modifié ou une signature corrompue doit être rejeté."""
    secret = "mon-super-secret-ci-cd-12345"
    now_ts = str(int(time.time()))
    body = b'{"threads": 50}'
    bad_signature = "badf00d" * 8

    assert verify_hmac_signature(secret, body, now_ts, bad_signature) is False
