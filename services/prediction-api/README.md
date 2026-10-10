# Waterlogging estimate API

One-hour probability of a waterlogging complaint in the Bengaluru area that has geolocated labels.

The probability is a model estimate. It is not a sensor depth and not an official warning. Outside that box the API returns `insufficient_data`.

## Run

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m app.cli clean-report
.venv/bin/python -m app.cli national-report
.venv/bin/python -m app.cli build-dataset
.venv/bin/python -m app.cli train
.venv/bin/uvicorn app.main:app --port 8000
.venv/bin/pytest
```

## Environment

See `.env.example`. `GOOGLE_ROUTES_API_KEY` and `GAUL_GEOJSON` are optional and stay on the server.

## Demo

`scripts/demo_estimate.py` calls the API with an in-process test client. It does not call emergency services.
