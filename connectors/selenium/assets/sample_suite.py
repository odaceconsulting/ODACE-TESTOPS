"""
Suite de tests fonctionnels Selenium de référence pour ODACE TestOps.
Comporte :
1. Un test nominal immédiatement réussi (REUSSI)
2. Un test instable qui échoue d'abord puis réussit à la 2e tentative (INSTABLE / Flaky)
3. Un test en échec fonctionnel systématique (ECHEC)
"""

import os
import tempfile
from pathlib import Path
import pytest


def test_parcours_nominal():
    """Test fonctionnel nominal : validation du chargement de page."""
    target_url = os.environ.get("TARGET_URL", "http://fake-target:8088")
    assert target_url.startswith("http")
    # Vérification d'assertion fonctionnelle réussie
    assert True


def test_parcours_instable_flaky():
    """
    Test volontairement instable (Flaky test).
    Échoue lors du premier passage, puis réussit lors de la 2e tentative (rerun).
    ODACE TestOps doit classifier ce test comme 'INSTABLE'.
    """
    flag_file = Path(tempfile.gettempdir()) / "odace_selenium_flaky_flag.tmp"

    if not flag_file.exists():
        # 1ère tentative : créer le fichier témoin et lever une exception
        flag_file.touch()
        pytest.fail("Échec transitoire simulé lors de la 1ère tentative de chargement IHM (Flaky)")
    else:
        # 2ème tentative (rerun) : nettoyer le flag et réussir le test
        try:
            flag_file.unlink(missing_ok=True)
        except Exception:
            pass
        assert True


def test_parcours_en_echec():
    """Test en échec fonctionnel constant : régression IHM détectée."""
    # Simulation d'un élément manquant ou d'une validation échouée
    expected_header = "Portail Facturation Conforme"
    actual_header = "Service Temporairement Indisponible"
    assert actual_header == expected_header, f"Attendu : '{expected_header}', Reçu : '{actual_header}'"
