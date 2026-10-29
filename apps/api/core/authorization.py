"""
Couche d'autorisation RBAC basée sur les 7 rôles stricts du Guide Développeurs.
Trace systématiquement tout refus d'accès dans la table audit_log de PostgreSQL.
"""

from typing import Callable, Sequence
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.core.authentication import CurrentUser, get_current_user
from apps.api.core.errors import APIError
from libs.domain.enums import UserRole
from libs.persistence.database import get_db_session
from libs.persistence.models import AuditLog


def require_role(*allowed_roles: UserRole) -> Callable:
    """
    Dépendance FastAPI exigeant que l'utilisateur possède au moins un des rôles listés.
    Tout refus est tracé de manière indélébile dans audit_log (Règles de sécurité Étape 2 & 9).
    """
    async def role_checker(
        request: Request,
        user: CurrentUser = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session),
    ) -> CurrentUser:
        user_roles_set = set(user.roles)
        allowed_roles_set = set(allowed_roles)

        has_explicit_role = bool(user_roles_set & allowed_roles_set)
        
        # Règle d'or du Guide (tableau page 12) :
        # L'administrateur peut tout, SAUF valider un résultat à la place d'un Tech Lead.
        is_admin_allowed = (
            UserRole.ADMIN in user_roles_set
            and (UserRole.TECH_LEAD not in allowed_roles_set or UserRole.ADMIN in allowed_roles_set)
        )

        if not (has_explicit_role or is_admin_allowed):
            # Enregistrer le refus dans audit_log de manière transactionnelle
            try:
                client_ip = request.client.host if request.client else "unknown"
                audit_entry = AuditLog(
                    actor=f"{user.full_name} ({user.username})",
                    action="policy.denied",
                    object_type="HTTP_ENDPOINT",
                    object_id=request.url.path,
                    ip_address=client_ip,
                    details={
                        "reason": "Permissions insuffisantes pour cette opération",
                        "user_roles": [r.value for r in user.roles],
                        "required_roles": [r.value for r in allowed_roles],
                        "path": request.url.path,
                        "method": request.method,
                    },
                )
                db.add(audit_entry)
                await db.commit()
            except Exception:
                # Ne pas bloquer l'exception 403 si l'écriture d'audit échoue
                pass

            raise APIError(
                code="FORBIDDEN_ROLE",
                message=f"Action non autorisée. Votre rôle ({[r.value for r in user.roles]}) n'a pas les droits requis ({[r.value for r in allowed_roles]}).",
                status_code=403,
                details={
                    "user": user.username,
                    "user_roles": [r.value for r in user.roles],
                    "required_roles": [r.value for r in allowed_roles],
                    "path": request.url.path,
                },
            )

        return user

    return role_checker
