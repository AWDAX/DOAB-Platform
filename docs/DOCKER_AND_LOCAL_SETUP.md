# DOAB Platform — Local Development & Docker Deployment Guide

This document provides a guide for running the DOAB platform locally using native CLI tools or Docker Compose.

---

## 🏗️ System Architecture & Services

The system comprises three primary components:

| Component | Stack | Default Port | Description |
|---|---|---|---|
| **Frontend PWA** | React 19, TypeScript, Vite, Tailwind v4 | `5173` (dev) / `3000` (docker) | Interactive map dashboard, routing, voice copilot, and telemetry UI. |
| **Prediction Backend** | Python 3.11+, FastAPI, Uvicorn, Scikit-Learn | `8000` | Geospatial waterlogging prediction, route scoring, weather aggregation, and boundaries. |
| **Relational Database** | PostgreSQL 16 / 18 | `5432` | Incident logs, telemetry storage, and spatial records. |

---

## ⚡ Option 1: Quickstart with Docker Compose (Recommended)

Docker Compose containerizes and links the Frontend, Backend, and PostgreSQL database with a single command.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- Ensure Docker daemon is accessible (`docker info`).

### 1. Launch All Services

From the `Codebase` root directory:

```bash
cd Codebase
docker compose up --build -d
```

### 2. Check Service Status & Logs

```bash
# Verify running containers and health checks
docker compose ps

# Follow logs across all containers
docker compose logs -f

# Follow logs for a specific service
docker compose logs -f backend
```

### 3. Service Endpoints

Once initialized, services are accessible at:
- **Web Application UI:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Prediction Microservice:** [http://localhost:8000](http://localhost:8000)
- **Interactive API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check:** [http://localhost:8000/health](http://localhost:8000/health)
- **PostgreSQL Database:** `localhost:5432` (User: `postgres`, Password: `postgres`, DB: `doab`)

### 4. Stop and Clean Up

```bash
# Stop containers
docker compose down

# Stop containers and remove persistent database volumes
docker compose down -v
```

---

## 💻 Option 2: Running Services Locally (Native CLI)

Follow these steps if you want to run services directly on your host machine for development or debugging.

### Prerequisites
- **Node.js** (v20+ recommended) & **npm**
- **Python** (v3.10+ recommended)
- **PostgreSQL** (Optional; backend runs in standalone mode if no database URL is provided)

---

### Step 1: Start the Backend (FastAPI Prediction Microservice)

1. Open a terminal and navigate to the prediction API directory:
   ```bash
   cd Codebase/services/prediction-api
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS / Git Bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. *(Optional)* Run dataset building and model training:
   ```bash
   # Verify dataset cleaning quality (no network needed)
   python -m app.cli clean-report

   # Cache weather & terrain data and build training matrix
   python -m app.cli build-dataset

   # Train and export calibrated gradient boosting model
   python -m app.cli train
   ```

5. Launch the FastAPI Uvicorn server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

6. Verify backend status:
   - Health check: `curl http://127.0.0.1:8000/health`
   - Swagger Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Step 2: Start the Frontend (React + Vite PWA)

1. Open a **second terminal** and navigate to the `Codebase` root:
   ```bash
   cd Codebase
   ```

2. Verify environment configuration:
   Ensure your `.env` (or `.env.local`) points to the local backend:
   ```env
   VITE_PREDICTION_API_URL=http://127.0.0.1:8000
   ```

3. Install frontend dependencies:
   ```bash
   npm install
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠️ Docker Files Reference

The following files configure the Docker setup:

- **`Codebase/docker-compose.yml`**: Defines the multi-container topology, port forwarding, shared private network (`doab-network`), environment variables, healthchecks, and PostgreSQL volume mounting.
- **`Codebase/Dockerfile`**: Two-stage production build for the frontend:
  1. `node:20-alpine`: Installs dependencies, runs `npm run build`.
  2. `nginx:alpine`: Serves static assets with gzip/caching and custom SPA fallback routing (`try_files $uri $uri/ /index.html;`).
- **`Codebase/services/prediction-api/Dockerfile`**: Container definition for the Python FastAPI backend with system build tools (`build-essential`, `libpq-dev`), dataset dependencies, and Uvicorn.
- **`Codebase/.dockerignore`**: Excludes `node_modules`, `.venv`, `.git`, `.apk`, and build caches from the build context.

---

## 🔍 Troubleshooting & Health Checks

### Docker Connection Error
If you receive `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`:
- Make sure **Docker Desktop** is running.
- Ensure WSL 2 / Hyper-V backend is active.

### CORS Errors in Browser
The backend allows CORS origins configured via `PREDICTION_CORS_ORIGINS`. In `docker-compose.yml`, origins default to:
`http://localhost:5173,http://localhost:3000,http://localhost:80,http://127.0.0.1:5173,http://127.0.0.1:8000`.

### Database Status: `not_configured` vs `connected`
- If running natively without local Postgres, the API starts normally and `/health` reports `"database": "not_configured"`.
- When run via `docker compose`, the backend automatically connects to `doab-db` over the internal bridge network and reports `"database": "connected"`.
