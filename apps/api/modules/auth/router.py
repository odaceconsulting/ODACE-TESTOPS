"""
Routes API d'authentification pour la plateforme ODACE TestOps.
Génère et gère les sessions sécurisées JWT et trace les événements d'accès.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.core.authentication import (
    CurrentUser,
    TokenResponse,
    UserCredentials,
    authenticate_user,
    create_access_token,
    get_current_user,
)
from apps.api.core.config import settings
from apps.api.core.errors import APIError
from libs.persistence.database import get_db_session
from libs.persistence.models import AuditLog, User

router = APIRouter(prefix="/auth", tags=["Authentification & Sessions"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authentification d'un utilisateur et émission du jeton JWT signé",
)
async def login(
    credentials: UserCredentials,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Authentifie l'utilisateur via ses identifiants.
    Émet un jeton Bearer JWT signé avec expiration et trace l'accès dans la table audit_log.
    """
    client_ip = request.client.host if request.client else "unknown"
    user = await authenticate_user(db, credentials.username, credentials.password)

    if not user:
        # Enregistrer la tentative infructueuse dans la piste d'audit légale
        audit_entry = AuditLog(
            actor=credentials.username.strip(),
            action="auth.failed",
            object_type="USER_SESSION",
            object_id=credentials.username.strip(),
            ip_address=client_ip,
            details={"reason": "Identifiants invalides", "username": credentials.username},
        )
        db.add(audit_entry)
        await db.commit()

        raise APIError(
            code="INVALID_CREDENTIALS",
            message="Nom d'utilisateur ou mot de passe incorrect.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    # Création du jeton JWT signé
    access_token = create_access_token(user)

    # Trace de succès dans l'audit légal
    audit_entry = AuditLog(
        actor=f"{user.full_name} ({user.username})",
        action="auth.login",
        object_type="USER_SESSION",
        object_id=user.id,
        ip_address=client_ip,
        details={
            "roles": [r.value for r in user.roles],
            "department": user.department,
        },
    )
    db.add(audit_entry)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user,
    )


@router.get(
    "/me",
    response_model=CurrentUser,
    summary="Obtenir le profil complet de l'utilisateur actuellement authentifié",
)
async def get_me(user: CurrentUser = Depends(get_current_user)):
    """Retourne l'identité et les rôles décodés du jeton JWT."""
    return user


@router.post(
    "/logout",
    summary="Déconnexion de l'utilisateur et traçabilité",
)
async def logout(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Clôture la session et enregistre l'événement dans le journal d'audit."""
    client_ip = request.client.host if request.client else "unknown"
    audit_entry = AuditLog(
        actor=f"{user.full_name} ({user.username})",
        action="auth.logout",
        object_type="USER_SESSION",
        object_id=user.id,
        ip_address=client_ip,
        details={"status": "Déconnexion volontaire"},
    )
    db.add(audit_entry)
    await db.commit()

    return {"message": "Session clôturée avec succès."}


@router.get(
    "/directory",
    summary="Annuaire des comptes et acteurs habilités",
)
async def list_official_accounts(db: AsyncSession = Depends(get_db_session)):
    """Retourne la liste des acteurs et profils depuis la table PostgreSQL 'users'."""
    stmt = select(User).where(User.is_active == True).order_by(User.created_at.asc())
    res = await db.execute(stmt)
    users = res.scalars().all()
    accounts = []
    for u in users:
        roles_list = u.roles if isinstance(u.roles, list) else []
        accounts.append({
            "id": str(u.id),
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "roles": roles_list,
            "role": roles_list[0] if roles_list else "user",
            "department": u.department,
            "avatar": u.avatar,
        })
    return accounts
