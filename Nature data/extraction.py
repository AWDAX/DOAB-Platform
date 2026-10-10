#!/usr/bin/env python3
"""Operational extraction entry point.

Historical rainfall, elevation and the one-hour forecast are fetched by the
prediction service (Open-Meteo ERA5 and Copernicus elevation). Earth Engine is
optional and only starts when GEE_PROJECT_ID is set. This script does not
embed a project id and does not call emergency services.

Commands (run from the repository root):
  python "Nature data/extraction.py" clean
  python "Nature data/extraction.py" national
  python "Nature data/extraction.py" boundaries
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SERVICE = REPO / "services" / "prediction-api"
PYTHON = SERVICE / ".venv" / "bin" / "python"


def _run(command: str) -> int:
    interpreter = str(PYTHON if PYTHON.is_file() else Path(sys.executable))
    completed = subprocess.run(
        [interpreter, "-m", "app.cli", command],
        cwd=SERVICE,
        check=False,
    )
    return completed.returncode


def main(argv: list[str]) -> int:
    command = argv[1] if len(argv) > 1 else "clean"
    mapping = {
        "clean": "clean-report",
        "precip": "build-dataset",
        "elevation": "build-dataset",
        "forecast": "build-dataset",
        "national": "national-report",
        "boundaries": "national-report",
    }
    if command == "boundaries":
        print("Boundary file: set GAUL_GEOJSON to a GAUL 2024 GeoJSON. Otherwise the API serves the labelled pilot box.")
        return 0
    if command not in mapping:
        print("Use clean, national, boundaries, precip, elevation, or forecast.")
        return 2
    return _run(mapping[command])


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
