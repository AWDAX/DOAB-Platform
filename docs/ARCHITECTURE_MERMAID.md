# 🏛️ DOAB & AWS Cloud Architecture Specification
## Comprehensive Architecture & Data Flow Diagrams

This document contains the complete, production-grade Mermaid architectural diagrams for the DOAB platform, illustrating the interplay between client devices, the AWS Serverless Mesh, AI inference pipelines, and municipal emergency broadcast channels.

---

### 1. End-to-End System Architecture (Complete Flowchart)

```mermaid
flowchart TD
    %% Styling Definitions
    classDef client fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef edge fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef aws fill:#172554,stroke:#f59e0b,stroke-width:2px,color:#f8fafc;
    classDef ai fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#f8fafc;
    classDef broadcast fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#f8fafc;

    %% Client Layer
    subgraph Clients ["📱 User & Municipal Client Tier"]
        WebClient["💻 Web Command Center<br/>(React 19 • TypeScript • Vite • Tailwind)"]:::client
        MobileClient["📲 Android Native Mobile App<br/>(Capacitor • Native Haptics • Geolocation)"]:::client
    end

    %% Edge & Auth Layer
    subgraph EdgeLayer ["🌐 AWS Edge, CDN & Identity Tier"]
        CF["Amazon CloudFront CDN<br/>(Edge Distribution • SSL Termination)"]:::edge
        S3Bucket["Amazon S3 Static Bucket<br/>(SPA Hosting • Cached Assets)"]:::edge
        Cognito["AWS Cognito<br/>(Identity Pools • Citizen/Admin RBAC)"]:::edge
    end

    %% Core AWS Services
    subgraph CoreAWS ["☁️ AWS Core Cloud Infrastructure"]
        LocService["Amazon Location Service<br/>(Geofencing • Matrix Routing • Tracking)"]:::aws
        DynamoDB["Amazon DynamoDB<br/>(6,000+ Ground-Truth Hazards • Incident State)"]:::aws
        RDS["Amazon RDS PostgreSQL<br/>(Municipal Assets • Elevation Contours)"]:::aws
        Lambda["AWS Lambda Microservices<br/>(Safe Path Scoring • Elevation Calculators)"]:::aws
    end

    %% High-Concurrence Distress Mesh
    subgraph EmergencyMesh ["🚨 Zero-Loss Life-Safety SOS Pipeline"]
        SOS_Trigger["Distress / SOS Trigger"]:::broadcast
        SQS["Amazon SQS Queue<br/>(Zero-Loss Inundation Buffer)"]:::broadcast
        SNS["Amazon SNS Topic<br/>(Instant Cellular Dispatch Broadcast)"]:::broadcast
        Dispatch["Disaster Teams (NDRF / SDRF)<br/>& Emergency Contacts"]:::broadcast
    end

    %% AI & Intelligence Layer
    subgraph AI_Engine ["🤖 Context-Enriched AI Inference Engine"]
        ContextAggregator["Live Context Aggregator<br/>(User GPS + Nearest 5 Hazards + Active Route)"]:::ai
        Groq["Groq Live Inference API<br/>(Qwen 3.8B / Llama 3.1 • Sub-100ms)"]:::ai
        AWDAX["AWDAX Synapical Research API<br/>(Deep Background Regional Crawler)"]:::ai
        SensorMatrix["Deterministic Sensor Matrix<br/>(Zero-Failure Localized Fallback)"]:::ai
    end

    %% Client to Edge Connections
    WebClient -->|HTTPS / WSS| CF
    MobileClient -->|Native WebView| CF
    CF --> S3Bucket
    WebClient & MobileClient -->|JWT Authentication| Cognito

    %% Client to Core AWS Services
    WebClient & MobileClient -->|Spatial Navigation| LocService
    LocService -->|Waypoint Coordinates| Lambda
    Lambda -->|Read Sensor Hazards| DynamoDB
    Lambda -->|Read Elevation DEMs| RDS

    %% Distress Flow
    MobileClient & WebClient -->|Emergency SOS Button| SOS_Trigger
    SOS_Trigger -->|High-Concurrency Ingest| SQS
    SQS -->|Process Alert Beacon| Lambda
    Lambda -->|Publish Distress Event| SNS
    SNS -->|SMS & High-Priority Push| Dispatch

    %% AI Pipeline Flow
    WebClient & MobileClient -->|Voice / Text Query| ContextAggregator
    ContextAggregator -->|Inject Live Coordinates & Depth| Groq
    Groq -.->|Fallback on Failover| AWDAX
    AWDAX -.->|Offline Failover| SensorMatrix
    Groq & AWDAX & SensorMatrix -->|Bilingual Civic Guidance| WebClient & MobileClient
```

---

### 2. Emergency SOS Beacon Execution (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as 📲 Citizen / Driver
    participant App as Capacitor Mobile App
    participant SQS as Amazon SQS (Queue)
    participant Lambda as AWS Lambda Worker
    participant DB as Amazon DynamoDB
    participant SNS as Amazon SNS (Broadcast)
    actor NDRF as 🚨 NDRF / Municipal Teams

    Citizen->>App: Taps Emergency SOS Button
    App->>App: Triggers Hardware Shockwave Haptics & Alarm
    App->>SQS: Enqueue Distress Beacon (GPS Lat/Lng, Elevation, Water Depth)
    Note over SQS: Buffer absorbs 50,000+ concurrent beacons without dropping packets
    SQS->>Lambda: Trigger Serverless Dispatch Function
    Lambda->>DB: Log Emergency Incident & Query Nearest Relief Shelters
    Lambda->>SNS: Publish Priority SOS Ticket
    SNS->>NDRF: Broadcast Urgent SMS & Field Worker Push Notifications
    SNS->>Citizen: Push In-App Confirmation with Nearest High-Ground Shelter
```

---

### 3. Context-Enriched Groq Copilot Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Driver as 🚗 Driver / Field Rider
    participant Voice as Web Speech STT (en-IN)
    participant Context as DOAB Local Engine
    participant Groq as Groq Live API (LPU)
    participant AWDAX as AWDAX Fallback

    Driver->>Voice: "Koramangala underpass mein kitna paani hai?"
    Voice->>Context: Transcribe to Text Stream
    Context->>Context: Inject User GPS + 5 Closest Flood Sensors + Active Route Risk
    Context->>Groq: Prompt with Ground-Truth Water Depth Matrix
    alt Groq Active (Sub-100ms)
        Groq-->>Driver: "65cm waterlogging at underpass. Take 80ft Road Flyover bypass (94% safety)."
    else Failover
        Context->>AWDAX: Query Synapical Regional Research
        AWDAX-->>Driver: Ground-Truth Verified Corridor Summary
    end
```
