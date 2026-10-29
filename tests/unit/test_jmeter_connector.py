"""
Tests unitaires du connecteur JMeter : validation JMX, parsing JTL et détection de saturation.
"""

from pathlib import Path
from connectors.jmeter.connector import JMeterConnector
from connectors.jmeter.jtl_parser import JTLStreamParser
from connectors.jmeter.saturation import GeneratorSaturationDetector, GeneratorStats
from connectors.jmeter.validator import JMeterPlanValidator
from libs.contracts.connectors import RunSpec
from libs.domain.enums import TestTool


def test_jmeter_validator_catches_absolute_paths(tmp_path: Path):
    jmx_file = tmp_path / "plan_invalide.jmx"
    # Plan contenant un chemin absolu interdit
    jmx_file.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
        <jmeterTestPlan version="1.2">
          <hashTree>
            <CSVDataSet>
              <stringProp name="filename">C:\\data\\users.csv</stringProp>
            </CSVDataSet>
          </hashTree>
        </jmeterTestPlan>
        """,
        encoding="utf-8"
    )

    validator = JMeterPlanValidator()
    spec = RunSpec(
        run_id="run-1",
        tool=TestTool.JMETER,
        asset_path=jmx_file,
        target_url="http://recette.odace.ci",
        target_max_threads=100,
        public_params={"threads": 50}
    )

    problems = validator.validate_plan(spec)
    codes = [p.code for p in problems]
    assert "ABSOLUTE_PATH_DETECTED" in codes


def test_jmeter_validator_catches_thread_quota_exceeded(tmp_path: Path):
    jmx_file = tmp_path / "plan_ok.jmx"
    jmx_file.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
        <jmeterTestPlan version="1.2"><hashTree/></jmeterTestPlan>
        """,
        encoding="utf-8"
    )

    validator = JMeterPlanValidator()
    spec = RunSpec(
        run_id="run-2",
        tool=TestTool.JMETER,
        asset_path=jmx_file,
        target_url="http://recette.odace.ci",
        target_max_threads=100,
        public_params={"threads": 250}  # Dépasse 100 !
    )

    problems = validator.validate_plan(spec)
    codes = [p.code for p in problems]
    assert "MAX_THREADS_EXCEEDED" in codes


def test_jmeter_prepare_command(tmp_path: Path):
    connector = JMeterConnector()
    jmx_file = tmp_path / "test.jmx"
    jmx_file.touch()

    spec = RunSpec(
        run_id="run-10",
        tool=TestTool.JMETER,
        asset_path=jmx_file,
        target_url="http://recette.odace.ci",
        public_params={"threads": "100", "duration": "300"}
    )

    cmd = connector.prepare(spec, tmp_path / "work")
    assert "-n" in cmd.args
    assert "-Jthreads=100" in cmd.args
    assert "-Jduration=300" in cmd.args
    assert "-l" in cmd.args


def test_jtl_stream_parser_calculates_percentiles(tmp_path: Path):
    jtl_file = tmp_path / "results.jtl"
    # Simulation de 10 requêtes horodatées
    content = [
        "timeStamp,elapsed,label,responseCode,responseMessage,threadName,dataType,success,failureMessage,bytes,sentBytes,grpThreads,allThreads,URL,Latency,IdleTime,Connect",
        "1000,100,GET /api/factures,200,OK,Thread 1-1,text,true,,500,100,1,1,http://...,90,0,10",
        "1100,150,GET /api/factures,200,OK,Thread 1-1,text,true,,500,100,1,1,http://...,140,0,10",
        "1200,200,GET /api/factures,200,OK,Thread 1-1,text,true,,500,100,1,1,http://...,190,0,10",
        "1300,250,GET /api/factures,200,OK,Thread 1-1,text,true,,500,100,1,1,http://...,240,0,10",
        "1400,300,GET /api/factures,200,OK,Thread 1-1,text,true,,500,100,1,1,http://...,290,0,10",
        "1500,350,GET /api/factures,200,OK,Thread 1-1,text,true,,500,100,1,1,http://...,340,0,10",
        "1600,400,GET /api/factures,200,OK,Thread 1-1,text,true,,500,100,1,1,http://...,390,0,10",
        "1700,500,GET /api/factures,200,OK,Thread 1-1,text,true,,500,100,1,1,http://...,490,0,10",
        "1800,800,GET /api/factures,200,OK,Thread 1-1,text,true,,500,100,1,1,http://...,790,0,10",
        "1900,1200,GET /api/factures,500,Error,Thread 1-1,text,false,Server Error,500,100,1,1,http://...,1190,0,10",
    ]
    jtl_file.write_text("\n".join(content), encoding="utf-8")

    parser = JTLStreamParser()
    metrics = parser.parse(jtl_file)

    assert metrics.total_samples == 10
    assert metrics.failed_samples == 1
    assert metrics.error_rate_pct == 10.0  # 1 échec sur 10 = 10%
    assert metrics.p50_ms == 325.0
    assert metrics.p90_ms == 840.0
    assert metrics.p99_ms == 1164.0


def test_generator_saturation_triggers_alert():
    detector = GeneratorSaturationDetector(cpu_threshold=80.0)

    # 1. Cas nominal : CPU 45% -> pas de saturation
    stats_ok = GeneratorStats(cpu_percent_p95=45.0, gc_pause_ms_p95=100.0, target_rps=100.0, achieved_rps=98.0)
    saturated, reasons = detector.is_saturated(stats_ok)
    assert not saturated
    assert len(reasons) == 0

    # 2. Cas injecteur saturé : CPU 87% -> saturation détectée
    stats_ko = GeneratorStats(cpu_percent_p95=87.0, gc_pause_ms_p95=100.0, target_rps=100.0, achieved_rps=98.0)
    saturated, reasons = detector.is_saturated(stats_ko)
    assert saturated
    assert any("Processeur de l'injecteur saturé" in r for r in reasons)
