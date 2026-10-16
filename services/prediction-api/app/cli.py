"""Command line entry points.

  python -m app.cli clean-report     # quality gates on the source CSV, no network
  python -m app.cli build-dataset    # fetch/cache weather + terrain, write training table
  python -m app.cli train            # train, evaluate on held-out splits, write model + manifest
"""

from __future__ import annotations

import argparse
import json
import logging
import sys

from .config import DEFAULT_INCIDENT_CSV, get_settings


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    parser = argparse.ArgumentParser(prog="prediction-api")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("clean-report", help="Print cleaning quality report (no network).")
    sub.add_parser("build-dataset", help="Build the case-control training table.")
    sub.add_parser("train", help="Train and evaluate the model.")
    sub.add_parser("national-report", help="Quality report for weak national labels (no network).")
    sub.add_parser("national-atlas", help="Inspect and profile national flood atlas & river gauges (CWC + INDOFLOODS).")
    args = parser.parse_args(argv)

    source = get_settings().incident_csv or DEFAULT_INCIDENT_CSV
    if args.command == "clean-report":
        from .incidents import load_and_clean

        print(json.dumps(load_and_clean(source).report, indent=2, default=str, ensure_ascii=False))
        return 0
    if args.command == "build-dataset":
        from .dataset import build_training_table

        _, report = build_training_table(source)
        print(json.dumps(report, indent=2, default=str, ensure_ascii=False))
        return 0
    if args.command == "national-report":
        from .national_labels import clean_national_labels

        _, report = clean_national_labels()
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0
    if args.command == "national-atlas":
        from .national_dataset import build_national_flood_atlas

        atlas = build_national_flood_atlas()
        print(json.dumps(atlas.report, indent=2, default=str, ensure_ascii=False))
        return 0
    if args.command == "train":
        from .model import train_and_save

        manifest = train_and_save()
        print(json.dumps(manifest, indent=2, default=str, ensure_ascii=False))
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
