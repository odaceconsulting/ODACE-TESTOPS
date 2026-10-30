"""
Tests unitaires complets du connecteur Selenium pour ODACE TestOps.
Vérifie la validation stricte (refus de charge), la normalisation JUnit en 4 statuts
et la détection des tests instables (flaky tests).
"""

from pathlib import Path
from connectors.selenium.connector import SeleniumConnector
from connectors.selenium.junit_parser import JUnitReportParser
from connectors.selenium.validator import SeleniumSuiteValidator
from libs.contracts.connectors import RunSpec
from libs.domain.enums import TestTool


def test_selenium_validator_forbids_load_injection(tmp_path: Path):
    suite_file = tmp_path / "test_suite.py"
    suite_file.write_text("def test_ok(): assert True", encoding="utf-8")

    validator = SeleniumSuiteValidator()

    # Tentative interdite d'utiliser Selenium avec 50 threads
    spec = RunSpec(
        run_id="run-selenium-load",
        tool=TestTool.SELENIUM,
        asset_path=suite_file,
        target_url="http://recette.odace.ci",
        public_params={"threads": 50}
    )

    problems = validator.validate_suite(spec)
    codes = [p.code for p in problems]
    assert "LOAD_INJECTION_FORBIDDEN" in codes
    assert any("strictement interdit pour Selenium" in p.message for p in problems)


def test_selenium_validator_accepts_single_thread_nominal(tmp_path: Path):
    suite_file = tmp_path / "test_suite.py"
    suite_file.write_text("def test_ok(): assert True", encoding="utf-8")

    validator = SeleniumSuiteValidator()

    # Exécution nominale autorisée (1 parcours à la fois)
    spec = RunSpec(
        run_id="run-selenium-ok",
        tool=TestTool.SELENIUM,
        asset_path=suite_file,
        target_url="http://recette.odace.ci",
        public_params={"threads": 1}
    )

    problems = validator.validate_suite(spec)
    assert len(problems) == 0


def test_selenium_validator_catches_absolute_paths(tmp_path: Path):
    suite_file = tmp_path / "test_invalid.py"
    suite_file.write_text(
        """
        def test_download():
            file_path = "C:\\\\Users\\\\admin\\\\Downloads\\\\facture.pdf"
            assert file_path
        """,
        encoding="utf-8"
    )

    validator = SeleniumSuiteValidator()
    spec = RunSpec(
        run_id="run-selenium-abs",
        tool=TestTool.SELENIUM,
        asset_path=suite_file,
        target_url="http://recette.odace.ci",
    )

    problems = validator.validate_suite(spec)
    codes = [p.code for p in problems]
    assert "ABSOLUTE_PATH_DETECTED" in codes


def test_selenium_prepare_command(tmp_path: Path):
    connector = SeleniumConnector()
    suite_file = tmp_path / "parcours.py"
    suite_file.touch()

    spec = RunSpec(
        run_id="run-sel-01",
        tool=TestTool.SELENIUM,
        asset_path=suite_file,
        target_url="http://recette.odace.ci",
        public_params={"maxfail": "2"}
    )

    cmd = connector.prepare(spec, tmp_path / "work")
    assert "pytest" in cmd.args
    assert "--reruns" in cmd.args
    assert "1" in cmd.args
    assert "--reruns-delay" in cmd.args
    assert "2" in cmd.args
    assert "--junitxml=" in "".join(cmd.args)
    assert cmd.env["TARGET_URL"] == "http://recette.odace.ci"
    assert cmd.env["HEADLESS"] == "true"


def test_junit_parser_normalizes_four_statuses_and_flaky(tmp_path: Path):
    junit_file = tmp_path / "report.xml"

    # Simulation d'un rapport XML JUnit avec:
    # 1. test_nominal (réussi du premier coup)
    # 2. test_flaky (tentative 1 en échec, tentative 2 réussie) -> INSTABLE
    # 3. test_ko (tentatives 1 et 2 en échec) -> ECHEC
    # 4. test_ignore (skipped) -> NON_EXECUTE
    xml_content = """<?xml version="1.0" encoding="utf-8"?>
    <testsuites>
      <testsuite name="pytest" tests="4" errors="0" failures="1" skipped="1">
        <testcase classname="tests.parcours" name="test_nominal" time="0.450" />
        
        <testcase classname="tests.parcours" name="test_flaky" time="0.300">
          <failure message="Timeout transit">Erreur 1ere tentative</failure>
        </testcase>
        <testcase classname="tests.parcours" name="test_flaky" time="0.250" />
        
        <testcase classname="tests.parcours" name="test_ko" time="0.400">
          <failure message="Element not found">Element absent</failure>
        </testcase>
        <testcase classname="tests.parcours" name="test_ko" time="0.410">
          <failure message="Element not found">Toujours absent apres rerun</failure>
        </testcase>
        
        <testcase classname="tests.parcours" name="test_ignore" time="0.001">
          <skipped message="Condition non remplie" />
        </testcase>
      </testsuite>
    </testsuites>
    """
    junit_file.write_text(xml_content, encoding="utf-8")

    parser = JUnitReportParser()
    metrics, cases, breakdown = parser.parse(junit_file)

    assert metrics.total_samples == 4
    assert metrics.failed_samples == 1
    assert metrics.flaky_count == 1
    assert metrics.error_rate_pct == 25.0

    statuses = {c.name: c.status for c in cases}
    assert statuses["test_nominal"] == "REUSSI"
    assert statuses["test_flaky"] == "INSTABLE"
    assert statuses["test_ko"] == "ECHEC"
    assert statuses["test_ignore"] == "NON_EXECUTE"

    assert breakdown["passed"] == 1
    assert breakdown["failed"] == 1
    assert breakdown["flaky"] == 1
    assert breakdown["skipped"] == 1
