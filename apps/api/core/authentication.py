"""
Couche d'authentification et gestion des identités par jetons JWT (OIDC).
Validation cryptographique de la signature, expiration et extraction des 7 rôles officiels.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from fastapi import Header, HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel

from apps.api.core.config import settings
from apps.api.core.errors import APIError
from apps.api.core.security import hash_password, verify_password
from libs.domain.enums import UserRole


class CurrentUser(BaseModel):
    id: str
    username: str
    full_name: str
    email: str
    roles: List[UserRole]
    department: str
    avatar: str
    allowed_projects: List[str] = ["*"]


class UserCredentials(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user: CurrentUser


from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from libs.persistence.models import User


async def authenticate_user(
    db: AsyncSession,
    identifier: str,
    password: str,
) -> Optional[CurrentUser]:
    """
    Authentifie l'utilisateur en consultant la table 'users' de la base de données PostgreSQL.
    Aucun mot de passe ni identifiant n'est conservé en dur dans le code source.
    Accepte indifféremment le nom d'utilisateur ou l'adresse e-mail.
    """
    cleaned = identifier.lower().strip()

    # Recherche insensible à la casse sur username ou email
    query = select(User).where(
        or_(
            func.lower(User.username) == cleaned,
            func.lower(User.email) == cleaned,
        ),
        User.is_active == True,
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    # Tolérance pour un préfixe d'email
    if not user and "@" in cleaned:
        prefix = cleaned.split("@")[0].strip()
        query_prefix = select(User).where(
            func.lower(User.username) == prefix,
            User.is_active == True,
        )
        res_prefix = await db.execute(query_prefix)
        user = res_prefix.scalar_one_or_none()

    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    # Conversion des rôles en UserRole
    user_roles: List[UserRole] = []
    raw_roles = user.roles if isinstance(user.roles, list) else []
    for r in raw_roles:
        try:
            user_roles.append(UserRole(r))
        except ValueError:
            pass

    return CurrentUser(
        id=str(user.id),
        username=user.username,
        full_name=user.full_name,
        email=user.email,
        roles=user_roles,
        department=user.department,
        avatar=user.avatar,
    )



def create_access_token(user: CurrentUser, expires_delta: Optional[timedelta] = None) -> str:
    """Génère un jeton JWT signé avec les rôles et l'identité de l'utilisateur."""
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    now = datetime.now(timezone.utc)
    expire = now + delta

    payload = {
        "sub": user.id,
        "username": user.username,
        "name": user.full_name,
        "email": user.email,
        "roles": [r.value for r in user.roles],
        "dept": user.department,
        "avatar": user.avatar,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": "odace-testops-platform",
        "aud": "odace-web-client",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> CurrentUser:
    """
    Dépendance FastAPI principale validant le jeton Bearer JWT.
    Rejette toute requête sans jeton ou avec un jeton invalide/expiré (HTTP 401).
    """
    if not authorization:
        raise APIError(
            code="UNAUTHORIZED",
            message="Authentification requise. Veuillez fournir un jeton Bearer valide dans l'en-tête Authorization.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise APIError(
            code="INVALID_AUTHORIZATION_HEADER",
            message="Format d'autorisation invalide. Format attendu: 'Bearer <token>'.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    token = parts[1]

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience="odace-web-client",
            issuer="odace-testops-platform",
        )
    except jwt.ExpiredSignatureError:
        raise APIError(
            code="TOKEN_EXPIRED",
            message="Votre session a expiré. Veuillez vous reconnecter.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    except JWTError as e:
        raise APIError(
            code="INVALID_TOKEN",
            message=f"Jeton JWT non valide ou altéré: {str(e)}",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    username: Optional[str] = payload.get("username")
    raw_roles: List[str] = payload.get("roles", [])

    if not username:
        raise APIError(
            code="INVALID_TOKEN_CLAIMS",
            message="Le jeton ne contient pas d'identité valide (claim 'username' manquant).",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    roles: List[UserRole] = []
    for r in raw_roles:
        try:
            roles.append(UserRole(r))
        except ValueError:
            pass

    if not roles:
        raise APIError(
            code="NO_ROLE_ASSIGNED",
            message="Aucun rôle valide n'est associé à cet utilisateur dans le jeton.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    return CurrentUser(
        id=payload.get("sub", username),
        username=username,
        full_name=payload.get("name", username),
        email=payload.get("email", f"{username}@odace.ci"),
        roles=roles,
        department=payload.get("dept", "ODACE"),
        avatar=payload.get("avatar", username[:2].upper()),
    )
