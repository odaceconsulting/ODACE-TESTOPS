"""
Parser de rapport JUnit XML pour le connecteur Selenium ODACE TestOps.
Normalise les résultats de tests fonctionnels en 4 statuts officiels :
- REUSSI : Test validé dès la première exécution
- ECHEC : Test en échec après épuisement des tentatives
- NON_EXECUTE : Test ignoré ou marqué skipped
- INSTABLE : Test réussi après une nouvelle tentative (détection de flaky test)
"""

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List
from libs.contracts.connectors import SampleMetric


class TestCaseResult:
    def __init__(self, name: str, classname: str, duration_s: float, status: str, error_message: str = ""):
        self.name = name
        self.classname = classname
        self.duration_s = duration_s
        self.status = status  # REUSSI, ECHEC, NON_EXECUTE, INSTABLE
        self.error_message = error_message

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "classname": self.classname,
            "duration_s": round(self.duration_s, 3),
            "status": self.status,
            "error_message": self.error_message,
        }


class JUnitReportParser:
    """Analyse les fichiers de rapport JUnit XML et produit des métriques normalisées."""

    def parse(self, junit_path: Path) -> tuple[SampleMetric, List[TestCaseResult], Dict[str, Any]]:
        if not junit_path.exists():
            return (
                SampleMetric(
                    total_samples=0,
                    failed_samples=0,
                    flaky_count=0,
                    error_rate_pct=0.0,
                    avg_ms=0.0,
                ),
                [],
                {"error": "Fichier de rapport JUnit inexistant"},
            )

        try:
            tree = ET.parse(junit_path)
            root = tree.getroot()
        except Exception as e:
            return (
                SampleMetric(
                    total_samples=0,
                    failed_samples=0,
                    flaky_count=0,
                    error_rate_pct=100.0,
                ),
                [],
                {"error": f"Erreur de syntaxe XML JUnit : {str(e)}"},
            )

        # Regroupement des testcases par identifiant unique (classname + name) pour détecter les reruns
        raw_cases: Dict[str, List[Dict[str, Any]]] = {}

        for case_elem in root.iter("testcase"):
            name = case_elem.get("name", "test_unnamed")
            classname = case_elem.get("classname", "default")
            key = f"{classname}::{name}"

            time_s = 0.0
            try:
                time_s = float(case_elem.get("time", "0.0"))
            except ValueError:
                pass

            is_skipped = case_elem.find("skipped") is not None
            failure_elem = case_elem.find("failure")
            error_elem = failure_elem if failure_elem is not None else case_elem.find("error")
            is_failure = error_elem is not None
            err_msg = error_elem.get("message", "") if error_elem is not None else ""

            if key not in raw_cases:
                raw_cases[key] = []

            raw_cases[key].append({
                "name": name,
                "classname": classname,
                "duration_s": time_s,
                "is_skipped": is_skipped,
                "is_failure": is_failure,
                "error_message": err_msg,
            })

        normalized_cases: List[TestCaseResult] = []
        passed_count = 0
        failed_count = 0
        skipped_count = 0
        flaky_count = 0
        total_duration_s = 0.0

        for key, attempts in raw_cases.items():
            first = attempts[0]
            name = first["name"]
            classname = first["classname"]
            dur = sum(a["duration_s"] for a in attempts)
            total_duration_s += dur

            num_attempts = len(attempts)
            last = attempts[-1]

            if any(a["is_skipped"] for a in attempts):
                stat = "NON_EXECUTE"
                skipped_count += 1
                err = last["error_message"]
            elif last["is_failure"]:
                stat = "ECHEC"
                failed_count += 1
                err = last["error_message"]
            elif num_attempts > 1 and not last["is_failure"]:
                # Échec lors d'une première tentative, mais réussi après rerun => INSTABLE (Flaky)
                stat = "INSTABLE"
                flaky_count += 1
                err = "Test instable validé lors de la seconde tentative (Flaky test)"
            else:
                stat = "REUSSI"
                passed_count += 1
                err = ""

            normalized_cases.append(TestCaseResult(name, classname, dur, stat, err))

        total_tests = len(normalized_cases)
        error_rate = (failed_count / total_tests * 100.0) if total_tests > 0 else 0.0
        avg_duration_ms = (total_duration_s / total_tests * 1000.0) if total_tests > 0 else 0.0

        metrics = SampleMetric(
            total_samples=total_tests,
            failed_samples=failed_count,
            flaky_count=flaky_count,
            error_rate_pct=round(error_rate, 2),
            avg_ms=round(avg_duration_ms, 2),
        )

        breakdown = {
            "total": total_tests,
            "passed": passed_count,
            "failed": failed_count,
            "skipped": skipped_count,
            "flaky": flaky_count,
            "flaky_rate_pct": round((flaky_count / total_tests * 100.0), 2) if total_tests > 0 else 0.0,
            "total_duration_seconds": round(total_duration_s, 2),
            "test_cases": [c.to_dict() for c in normalized_cases],
        }

        return metrics, normalized_cases, breakdown
