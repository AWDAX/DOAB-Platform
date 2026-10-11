# DOAB Platform — Deployment & Production Architecture Guide

**Live Production URLs:**
- **Web Application (AWS CloudFront CDN):** [https://doab.sahnirmaan.live/](https://doab.sahnirmaan.live/)
- **Direct CloudFront Origin:** [https://d38z2t6y9aj34z.cloudfront.net/](https://d38z2t6y9aj34z.cloudfront.net/)
- **Backend API (AWS EC2 + Nginx):** [https://api-doab.sahnirmaan.live/](https://api-doab.sahnirmaan.live/)
- **API Health Check:** [https://api-doab.sahnirmaan.live/health](https://api-doab.sahnirmaan.live/health)
- **Database:** AWS RDS PostgreSQL 18.3 (`doab-db.cxqiuycwmsj2.ap-southeast-2.rds.amazonaws.com:5432`)
- **Android APK:** [`Codebase/Z-Sentinel-DOAB.apk`](./Z-Sentinel-DOAB.apk) (Live URL Mode wired to `https://doab.sahnirmaan.live`)

---

## 🏗️ 1. Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │            User Clients              │
                      │  (Browser Web App / Android Mobile)  │
                      └──────────────────┬───────────────────┘
                                         │
                        https://doab.sahnirmaan.live
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │    Cloudflare Edge Worker Proxy      │
                      │  (SSL termination + Host Rewriting)  │
                      └──────────────────┬───────────────────┘
                                         │
                        Host: d38z2t6y9aj34z.cloudfront.net
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │        AWS CloudFront CDN            │
                      │    (Distribution: E20R65BKZ9U404)    │
                      │   - Default Root Object: index.html   │
                      │   - SPA Error Rewrite: 403/404 -> 200│
                      └──────────────────┬───────────────────┘
                                         │
                                  OAC Authorized
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │          AWS S3 Bucket               │
                      │   `doab-frontend-970909364340`       │
                      │  (Private, SSE-S3 AES-256 Encrypted) │
                      └──────────────────────────────────────┘

       ═══════════════════════════════════════════════════════════════════════
       
                      ┌──────────────────────────────────────┐
                      │   API: https://api-doab.sahnirmaan.live│
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │        AWS EC2 Ubuntu 24.04          │
                      │     (Instance: i-08ee66bd755778bc9)  │
                      │  - Nginx Reverse Proxy (SSL Certbot) │
                      │  - FastAPI Prediction Service        │
                      │  - systemd: zplus-backend.service    │
                      └──────────────────┬───────────────────┘
                                         │
                               Private VPC Port 5432
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │       AWS RDS PostgreSQL 18.3        │
                      │      (Instance: `doab-db`)           │
                      │  - Security Group: rds-doab-sg       │
                      │  - Inbound: Authorized from EC2 SG   │
                      └──────────────────────────────────────┘
```

---

## 🚀 2. What We Implemented & Configured

### A. AWS S3 + CloudFront Frontend Infrastructure
1. **Private S3 Storage Bucket:**
   - Bucket: `doab-frontend-970909364340` (Region: `ap-southeast-2` Sydney).
   - Enforced **SSE-S3 AES-256 encryption** and blocked all public access.
2. **AWS CloudFront Global CDN Distribution:**
   - Distribution ID: `E20R65BKZ9U404`
   - Domain: `d38z2t6y9aj34z.cloudfront.net`
   - Configured **Origin Access Control (OAC)** policy restricting S3 reads strictly to the CloudFront service principal.
   - **Default Root Object:** Set to `index.html`.
   - **Single Page Application (SPA) Routing:** Configured custom error responses for HTTP `403` and `404` to rewrite to `/index.html` with HTTP `200 OK`, allowing direct navigation to deep routes (e.g. `/map`, `/team`).
   - **Tactical Radar 404 Error Page:** Implemented custom emergency-themed error view (`src/pages/NotFoundPage.tsx`) wired into `App.tsx`.

### B. Cloudflare Edge Host Header Routing
* **Challenge:** In AWS accounts with managed project policies restricted to `ap-southeast-2`, ACM certificates in `us-east-1` (mandatory for CloudFront custom domains) cannot be created.
* **Solution:** Deployed an edge Cloudflare Worker (`doab-proxy`) attached to custom domain `doab.sahnirmaan.live`:
  ```javascript
  export default {
    async fetch(request) {
      const url = new URL(request.url);
      url.hostname = "d38z2t6y9aj34z.cloudfront.net";
      return fetch(new Request(url.toString(), request));
    }
  };
  ```
* Seamlessly delivers edge TLS certificates while CloudFront fulfills all requests with zero host-mismatch errors.

### C. AWS RDS PostgreSQL Database
1. **Provisioning:**
   - Database Identifier: `doab-db` (`db.t4g.micro`, 20GB gp2 storage).
   - Endpoint: `doab-db.cxqiuycwmsj2.ap-southeast-2.rds.amazonaws.com:5432`.
   - Engine: PostgreSQL 18.3.
2. **Private Security Group (`rds-doab-sg`):**
   - Inbound Rule: TCP Port 5432 authorized strictly from the EC2 security group (`launch-wizard-1` / `sg-01309e3fbaeb6a86c`).
   - Private subnet communication without exposing database port to the public internet.
3. **Application Integration:**
   - Stored secure credentials in EC2 at `/home/ubuntu/.doab.env` (permissions `chmod 600`).
   - Configured `zplus-backend.service` to load `EnvironmentFile=-/home/ubuntu/.doab.env`.
   - Verified live database connectivity via health endpoint (`"database": "connected"`).

### D. Automated CI/CD GitHub Actions Pipeline
1. **Pipeline Configuration (`.github/workflows/deploy-backend.yml`):**
   - Trigger: Push to `main` branch.
   - Security: Uses SSH private keys and encrypted GitHub Repository Secrets (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`).
   - Rsync synchronization: Excludes virtual environments (`--exclude="venv"`) and temp files, ensuring Python environment integrity.
   - Restarts backend cleanly: `sudo systemctl restart zplus-backend`.
2. **Verification:** Successfully executed automated builds with zero manual SSH interventions.

### E. Native Android Mobile Application
- **Capacitor Configuration (`capacitor.config.ts`):** Configured `server.url = 'https://doab.sahnirmaan.live'` with cleartext permissions disabled.
- **Compiled Binary:** Generated production-ready APK at `Codebase/Z-Sentinel-DOAB.apk` (7.7 MB) with native geolocation and vibration sensor bridges.

### F. Amazon Location Service (Geospatial Intelligence)
1. **Place Index Provisioning:**
   - Index Name: `doab-place-index`
   - ARN: `arn:aws:geo:ap-southeast-2:970909364340:place-index/doab-place-index`
   - Data Source: Esri
   - Pricing Plan: RequestBasedUsage
2. **Cognito Identity Federation:**
   - Identity Pool: `doab-als-pool` (`ap-southeast-2:ff8ccdf5-4e7a-45c8-861d-51221d0ea28d`)
   - Unauthenticated IAM Role: `doab-als-unauth-role`
   - Scoped IAM Policy: Strictly authorizes `geo:SearchPlaceIndexForText` and `geo:SearchPlaceIndexForSuggestions` on the `doab-place-index` resource only.
3. **Application Integration:**
   - Client Library: `src/lib/amazonLocation.ts` using `@aws-sdk/client-location` and `@aws-sdk/credential-providers`.
   - Real-time Place Autocomplete: Search bar debounces user input and queries Amazon Location Service with country biasing (`IND`).
   - Dynamic Interactive Pinning: Selecting a geocoded suggestion flies the map directly to coordinates and anchors an active ALS telemetry pin.


---

## 🔍 3. Live Verification & Health Checks

Run these commands from any terminal to verify the live production cluster:

```bash
# 1. Test Web App Delivery via CloudFront Edge
curl -s -I https://doab.sahnirmaan.live/
# Expected: HTTP/1.1 200 OK (Server: cloudflare, Via: ... cloudfront.net)

# 2. Test SPA Subpath Routing (React Router)
curl -s -I https://doab.sahnirmaan.live/map
# Expected: HTTP/1.1 200 OK

# 3. Test Backend Microservice & RDS Database
curl -s https://api-doab.sahnirmaan.live/health
# Expected: {"status":"ok","model_ready":false,"database":"connected"}
```
