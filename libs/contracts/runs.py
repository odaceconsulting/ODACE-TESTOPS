"""
Schémas de requêtes et de réponses pour les exécutions de test.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from libs.domain.enums import HumanValidation, RunResult, RunState, TestTool


class RunCreateRequest(BaseModel):
    """Corps de la requête POST /runs."""
    project_id: uuid.UUID
    asset_id: uuid.UUID
    target_id: uuid.UUID
    public_params: Dict[str, Any] = Field(default_factory=dict)
    secret_vault_refs: Dict[str, str] = Field(default_factory=dict)


class ArtifactResponse(BaseModel):
    id: uuid.UUID
    artifact_type: str
    object_path: str
    sha256_hash: str
    size_bytes: int
    created_at: datetime

    class Config:
        from_attributes = True


class RunResponse(BaseModel):
    """Représentation publique d'une exécution."""
    id: uuid.UUID
    project_id: uuid.UUID
    asset_id: uuid.UUID
    target_id: uuid.UUID
    idempotency_key: str
    requested_by: str
    state: RunState
    result: Optional[RunResult] = None
    validation: HumanValidation
    validation_comment: Optional[str] = None
    validated_by: Optional[str] = None
    validated_at: Optional[datetime] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    events: List["RunEventResponse"] = Field(default_factory=list)
    artifacts: List[ArtifactResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class RunValidationRequest(BaseModel):
    """Corps de la requête POST /runs/{id}/validate par le Tech Lead."""
    decision: HumanValidation = Field(..., description="VALIDE ou REFUSE")
    comment: Optional[str] = None


class RunEventResponse(BaseModel):
    id: uuid.UUID
    timestamp: datetime
    from_state: Optional[str]
    to_state: str
    cause: str
    details: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
