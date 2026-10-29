"""
Contrats de données échangés entre les agents, les connecteurs et l'orchestrateur.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from libs.domain.enums import RunResult, TestTool


class Problem(BaseModel):
    """Anomalie détectée lors de la phase de validation préalable d'un script."""
    code: str
    message: str
    severity: str = "ERROR"  # ERROR ou WARNING


class RunSpec(BaseModel):
    """Spécification d'exécution transmise au connecteur."""
    run_id: str
    tool: TestTool
    asset_path: Path
    target_url: str
    public_params: Dict[str, Any] = Field(default_factory=dict)
    secret_env_refs: Dict[str, str] = Field(default_factory=dict)
    target_max_threads: int = 500


class CommandSpec(BaseModel):
    """Commande à lancer dans le conteneur isolé de l'agent."""
    args: List[str]
    workdir: Path
    env: Dict[str, str] = Field(default_factory=dict)


class SampleMetric(BaseModel):
    """Mesures synthétiques extraites des rapports (JTL / JUnit)."""
    p50_ms: Optional[float] = None
    p90_ms: Optional[float] = None
    p95_ms: Optional[float] = None
    p99_ms: Optional[float] = None
    avg_ms: Optional[float] = None
    throughput_rps: Optional[float] = None
    error_rate_pct: Optional[float] = None
    total_samples: int = 0
    failed_samples: int = 0
    flaky_count: int = 0


class NormalizedResult(BaseModel):
    """Résultat normalisé extrait par la méthode parse() du connecteur."""
    tool: TestTool
    raw_status: str
    metrics: SampleMetric
    generator_saturated: bool = False
    evidence_files: List[str] = Field(default_factory=list)
    details: Dict[str, Any] = Field(default_factory=dict)
