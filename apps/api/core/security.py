"""
Fonctions cryptographiques de sécurité pour l'authentification ODACE TestOps.
Utilise HMAC / PBKDF2 avec SHA-256 et sel pour un hachage conforme aux normes.
"""

import hashlib
import os
import secrets
from typing import Tuple


def hash_password(password: str, salt: bytes = None) -> str:
    """Hache un mot de passe en utilisant PBKDF2-HMAC-SHA256 avec 100 000 itérations."""
    if salt is None:
        salt = os.urandom(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}:{hashed.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Vérifie un mot de passe contre son empreinte stockée en temps constant."""
    try:
        salt_hex, hash_hex = stored_hash.split(":")
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
        actual_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return secrets.compare_digest(actual_hash, expected_hash)
    except Exception:
        return False
