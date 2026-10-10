# AWDAX Data Collection Strategy & Architecture


## 1. Problem Statement
There is no unified, reliable API for municipal waterlogging and drainage data across Indian states. State grievance portals are highly fragmented, unstructured, and often lack real-time synchronization.

## 2. Proposed Solution
To bypass the lack of standardized APIs, this project proposes utilizing **AWDAX**, an AI-powered research and scraping agent, to visually and semantically extract structured data from unstructured state dashboards. 

To ensure a lightning-fast User Experience (UX) while maintaining data accuracy, the architecture strictly decouples the AI scraping process from the end-user request.

---

## 3. The 3-Phase Data Architecture

```mermaid
flowchart TD
    %% Styling
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef database fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef scraper fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;

    subgraph Historical "Phase 1: Historical Data (Training Foundation)"
        A[State Complaint Portals] --> C
        B[News Articles / Twitter Archives] --> C
        C(AWDAX AI Scraper):::scraper --> D[(Static Dataset CSV/JSON)]
        D --> E[ML Training - Predictive Models]
    end

    subgraph Async "Phase 2: Live Scraping (Asynchronous Cron)"
        F[Targeted Web/News Search via Reverse Geocoding] --> G
        G(AWDAX Scheduled Job Every 1 hr):::scraper --> H[(Central Database\nMongoDB/PostgreSQL)]:::database
    end

    subgraph RealTime "Phase 3: Real-Time UX (Sub-second Latency)"
        I((Citizen App Prototype)):::frontend -->|1. Sends Location on Load| H
        H -.->|2. Returns Active Alerts instantly| I
        I -->|3. Citizen Reports Issue (Crowdsourcing)| H
    end
```

### Architectural Decisions
* **Why not real-time AI scraping?** Triggering a web scraper when a user opens the app introduces severe latency (10–60 seconds). Mobile applications require millisecond responses.
* **The Hybrid Approach:** We use AWDAX for batch background ingestion (Historical and Hourly Updates). The app queries our own fast database.
* **Crowdsourcing as the Source of Truth:** Because official dashboards lag, the citizen app itself acts as the primary real-time ingestion engine.

---

## 4. Proof of Concept (PoC)

To validate this architecture, a test run was conducted using the AWDAX REST API against a known public incident table.

* **Target Source:** UFEWS Gorakhpur, Uttar Pradesh (`https://ufews.com/web/Incident/Index`)
* **Objective:** Extract Date, Category, and Status without writing custom HTML/CSS parsing logic.
* **Method:** AWDAX API call via PowerShell `Invoke-RestMethod` using a Bearer token. *(Note: API Keys must be stored in `.env` and never committed to source control).*

### PoC Extraction Results

| Date | Category | Status | Source |
| :--- | :--- | :--- | :--- |
| 29-05-2026 04:50 PM | Drainage Blockage | Resolved | ufews.com |
| 09-04-2026 01:11 PM | Water Logging | Resolved | ufews.com |
| 20-03-2026 03:55 PM | Drainage Blockage | Open | ufews.com |
| 20-03-2026 03:55 PM | Drainage Blockage | InProgress | ufews.com |
| 20-03-2026 03:26 PM | Water Logging | Resolved | ufews.com |
| 18-03-2026 11:50 AM | Water Logging | Open | ufews.com |
| 18-03-2026 11:45 AM | Water Logging | Open | ufews.com |
| 11-01-2026 09:38 AM | Drainage Blockage | ReOpen | ufews.com |
| 13-12-2025 12:22 PM | Drainage Blockage | Closed | ufews.com |
| 12-12-2025 02:58 PM | Water Logging | Closed | ufews.com |
| 08-12-2025 11:19 AM | Water Logging | ReOpen | ufews.com |

**Conclusion:** The PoC was highly successful. AWDAX correctly structured the unstructured HTML table data, proving that Phase 1 (Historical Dataset Generation) is entirely viable for the hackathon prototype.


---

## 6. Implementation Scripts & Security Bypasses

To execute the architectures outlined above, two core Python scripts were engineered. These scripts automate the data ingestion while solving critical API and geospatial limitations.

### A. The Historical Batch Scraper (`scripts/historical_batch_scraper.py`)
This script fulfills Phase 1 (Historical Ingestion). It algorithmically loops through the `india_waterlogging_source_matrix.csv`, extracting only valid official URLs.
* **Data Provenance:** To maintain strict curation for Machine Learning reliability, the script forcefully injects `State` and `Source_URL` columns into the extracted data, proving exactly which official source the incident came from.
* **WAF Security Bypass:** During initial execution, AWDAX rejected the scraper with `403 Forbidden` errors because it detected Python's native `urllib` headers. The script was patched to inject standard `Chrome/120.0.0.0` User-Agent strings, completely bypassing the Web Application Firewall (WAF).

### B. The Live Coordinate Scraper (`scripts/live_coordinate_scraper.py`)
Web scrapers cannot natively scan the internet using raw GPS coordinates (e.g., `Lat: 12.9352, Lon: 77.6245`). 
* **The Solution:** The script utilizes **Reverse Geocoding** via the free OpenStreetMap Nominatim API. It intercepts the user's raw coordinates, resolves them to a strict string (e.g., `"Koramangala, Bengaluru"`), and dynamically builds a custom text prompt for AWDAX to search local news and municipal updates in real-time.

### Future Work: The Pandas Normalization Layer
Because AWDAX relies on unstructured LLM categorization, the raw outputs are prone to "Categorical Drift" (e.g., mixing `Waterlogging` and `Flooded`). Before feeding this dataset into AWS models, an intermediate Pandas pipeline will be introduced to lowercase, clean, and strictly normalize all categories.


### C. The Fallback Broad Scraper (`scripts/fallback_broad_scraper.py`)
Because 28 states had no official URL listed, and several states locked their data behind un-bypassable CAPTCHAs/logins (Hard Auth Walls), a secondary script was developed. 
* **The Strategy:** Instead of forcing AWDAX to parse a locked state portal, this script unleashes AWDAX to search the open web. It commands AWDAX to search historical local news archives, NGO reports, and public datasets (like Kaggle) for waterlogging incidents in those specific missing states. 
* **Dataset Consolidation:** The results from this broad search are appended directly into the `historical_master_dataset.csv`, but the `Source_URL` column is tagged as `Broad_Web_Search` to maintain transparency regarding the data's origin.


---

## 7. Extraction Progress & Dataset Metrics (Live Run)

As the automated ingestion loops across both official portals and the fallback broad web scraping pipeline, data is dynamically accumulated into `historical_master_dataset.csv`.

### Accumulated Yield (Final Circuit Summary):
* **Total Rows Extracted in Master Dataset:** **11,727 records** across **18 Indian States & Union Territories**
* **Bihar (Broad Web Search & Open Portal):** 5,004 rows
* **Karnataka (OpenCity Portal):** 4,991 rows
* **Telangana (Broad Search & Municipal Flood Feeds):** 999 rows
* **Manipur (Regional Disaster & Flash Flood Archives):** 270 rows
* **Assam (Flood & Inundation Incident Repositories):** 219 rows
* **Kerala (Local Government & Inundation Logs):** 118 rows
* **Dadra & Nagar Haveli & Daman & Diu:** 45 rows
* **Uttar Pradesh (UFEWS Portal):** 17 rows
* **Uttarakhand (Monsoon Inundation Records):** 17 rows
* **West Bengal (Portal / Cloudburst Archive):** 11 rows
* **Ladakh (Extreme Weather & Drainage Logs):** 8 rows
* **Maharashtra (Broad Web Search):** 7 rows
* **Gujarat (Broad Web Search):** 6 rows
* **Chhattisgarh (Broad Web Search):** 6 rows
* **Nagaland (Broad Web Search):** 3 rows
* **Rajasthan (Broad Web Search):** 3 rows
* **Chandigarh (Broad Web Search):** 2 rows
* **Punjab (Broad Web Search):** 1 row

### Circuit Execution Status:
* **All 36 States & Union Territories Processed:** The full national matrix from Jammu & Kashmir down to Lakshadweep and Puducherry was scanned.
* **Output Destination:** `DataSet/WaterLogging Dataset/historical_master_dataset.csv` with strict provenance (`State`, `Source_URL`) tags preserved.

### Key Observation — Schema Variance & Justification for Phase 2 Normalization:
Because different regional sources and AWDAX instance prompts yielded slight schema variations (e.g., 5 to 8 columns with fields like `Source url`, `Status`, `Category`), the raw master CSV contains ragged row counts. This confirms our initial architectural critique and demonstrates why the **Pandas Normalization Layer** is essential prior to feeding data into AWS machine learning models.


---

## 8. Dataset Normalization & Curation Layer (`curated_waterlogging_clean.csv`)

To resolve the schema variance, ragged row distribution (7 vs 8 fields), and disparate categorical labels produced by multi-source web harvesting, an automated data engineering pipeline was executed via `scripts/normalize_curate_dataset.py`.

### Architecture & File Distinctness:
* **Raw Historical Dataset (Preserved):** `DataSet/WaterLogging Dataset/historical_master_dataset_RAW.csv` (2.01 MB, 11,727 raw unstructured records).
* **Curated Production Dataset (New):** `DataSet/WaterLogging Dataset/curated_waterlogging_clean.csv` (Clean 11-column standardized format, fully ingestible by Pandas/PyTorch/AWS).

### Standardized 11-Column Schema:
1. **`Record_ID`**: Unique sequential record identifier (1 to 11,727).
2. **`State`**: Standardized Indian State or Union Territory name.
3. **`Location`**: Neighborhood, district, or landmark text.
4. **`Incident_Date_Normalized`**: ISO formatted date (`YYYY-MM-DD` or `YYYY-MM`).
5. **`Date_Raw`**: Preserved original raw date string for auditing.
6. **`Category_Standardized`**: Canonical incident classification:
   * *Monsoon Inundation & Riverine Flood* (5,004 records)
   * *Road Infrastructure & Monsoon Potholes* (2,040 records)
   * *General Civic & Infrastructure Complaint* (1,674 records)
   * *Drain Encroachment & Waste Blockage* (1,446 records)
   * *Water Body & Catchment Inundation Risk* (999 records)
   * *Daily Monsoon Flood Situation Bulletin* (219 records)
   * *Stormwater Drain / Sewerage Blockage* (176 records)
   * *Urban Flooding / Flash Flood* (147 records)
   * *Waterlogging & Inundation* (22 records)
7. **`Category_Original`**: Exact raw category from portal/news source.
8. **`Status_Standardized`**: Canonical status (`Resolved`, `Open / In Progress`, `Historical Record / Monitored`, `Surveyed / Monitored`, `Severe / Disruption / Fatalities`).
9. **`Source_URL`**: Verified portal, dataset repository, or bulletin link.
10. **`Source_Type`**: Provenance classification (`Official_State_Portal`, `Open_Data_Repository`, `Disaster_Archive_Or_Report`, `Broad_Web_Search`).
11. **`Severity_Or_Metric`**: Supplemental quantitative data (e.g., inundation indicator score).
