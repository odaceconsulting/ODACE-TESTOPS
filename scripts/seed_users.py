"""Amorçage sécurisé des utilisateurs et de leurs rôles en base de données PostgreSQL.

Les mots de passe ne sont jamais écrits en clair dans le code.
Le hash cryptographique PBKDF2-HMAC-SHA256 avec sel aléatoire est calculé et stocké en base.
"""

import asyncio
import os
import uuid
from sqlalchemy import select

from apps.api.core.security import hash_password
from libs.persistence.database import async_session_maker
from libs.persistence.models import User

# Mot de passe initial configurable via variable d'environnement
INITIAL_SEED_PASSWORD = os.environ.get("INITIAL_SEED_PASSWORD", "odace2026!")

USERS_TO_SEED = [
    {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111101"),
        "username": "marie.laurent",
        "email": "marie.laurent@odace.ci",
        "full_name": "Marie Laurent",
        "department": "Qualité logicielle",
        "roles": ["tech_lead"],
        "avatar": "ML",
    },
    {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111102"),
        "username": "marc.vasseur",
        "email": "marc.vasseur@odace.ci",
        "full_name": "Marc Vasseur",
        "department": "DSI / Plateforme",
        "roles": ["admin"],
        "avatar": "MV",
    },
    {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111103"),
        "username": "eleonore.kasse",
        "email": "eleonore.kasse@odace.ci",
        "full_name": "Éléonore Kassé",
        "department": "Direction Projets",
        "roles": ["responsable"],
        "avatar": "EK",
    },
    {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111104"),
        "username": "alexandre.dupont",
        "email": "alexandre.dupont@odace.ci",
        "full_name": "Alexandre Dupont",
        "department": "Équipe QA Facturation",
        "roles": ["tester"],
        "avatar": "AD",
    },
    {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111105"),
        "username": "lucas.bernard",
        "email": "lucas.bernard@odace.ci",
        "full_name": "Lucas Bernard",
        "department": "Backend Core",
        "roles": ["developer"],
        "avatar": "LB",
    },
    {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111106"),
        "username": "sophie.martin",
        "email": "sophie.martin@odace.ci",
        "full_name": "Sophie Martin",
        "department": "Infra & Run",
        "roles": ["exploitation"],
        "avatar": "SM",
    },
    {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111107"),
        "username": "jean-yves.traore",
        "email": "jean-yves.traore@odace.ci",
        "full_name": "Jean-Yves Traoré",
        "department": "Audit & Risques",
        "roles": ["auditor"],
        "avatar": "JT",
    },
]


async def seed_users() -> None:
    print("🔐 Amorçage des utilisateurs et rôles dans PostgreSQL...")
    async with async_session_maker() as session:
        created_count = 0
        updated_count = 0

        for u in USERS_TO_SEED:
            stmt = select(User).where(User.username == u["username"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()

            # Hash calculé dynamiquement avec sel PBKDF2
            pwd_hash = hash_password(INITIAL_SEED_PASSWORD)

            if existing is None:
                new_user = User(
                    id=u["id"],
                    username=u["username"],
                    email=u["email"],
                    password_hash=pwd_hash,
                    full_name=u["full_name"],
                    department=u["department"],
                    roles=u["roles"],
                    avatar=u["avatar"],
                    is_active=True,
                )
                session.add(new_user)
                created_count += 1
            else:
                existing.roles = u["roles"]
                existing.full_name = u["full_name"]
                existing.department = u["department"]
                existing.email = u["email"]
                existing.avatar = u["avatar"]
                existing.password_hash = pwd_hash
                existing.is_active = True
                updated_count += 1

        await session.commit()
        print(f"✅ Utilisateurs amorcés avec succès : {created_count} créés, {updated_count} mis à jour.")


if __name__ == "__main__":
    asyncio.run(seed_users())
