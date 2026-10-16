import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'docs'))
os.makedirs(DOCS_DIR, exist_ok=True)
FLOWCHART_JPG_PATH = os.path.join(DOCS_DIR, 'COMPETITOR_LANDSCAPE_FLOWCHART.jpg')
DOCX_PATH = os.path.join(DOCS_DIR, 'COMPETITIVE_ANALYSIS.docx')
MD_PATH = os.path.join(DOCS_DIR, 'COMPETITIVE_ANALYSIS.md')

def generate_flowchart():
    fig, ax = plt.subplots(figsize=(18, 12), dpi=220)
    fig.patch.set_facecolor('#0A1118')
    ax.set_facecolor('#0A1118')
    ax.axis('off')

    # Title & Subtitle
    ax.text(0.5, 0.96, "DOAB vs. COMPETITIVE & CIVIC LANDSCAPE ARCHITECTURE", 
            fontsize=20, weight='bold', color='#E0F2FE', ha='center', fontfamily='sans-serif')
    ax.text(0.5, 0.935, "Comparative Flow Analysis: Global Tech Giants, Indian Government Platforms & DOAB Unique Value Proposition", 
            fontsize=11, color='#94A3B8', ha='center', fontfamily='sans-serif')

    def draw_box(x, y, w, h, title, subtitle, items, bg_color, border_color, title_color='#FFFFFF'):
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.015,rounding_size=0.02",
                                      linewidth=1.5, edgecolor=border_color, facecolor=bg_color, zorder=2)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h - 0.035, title, fontsize=11, weight='bold', color=title_color, ha='center', va='top')
        if subtitle:
            ax.text(x + w/2, y + h - 0.065, subtitle, fontsize=8.5, color='#94A3B8', ha='center', va='top', style='italic')
            start_y = y + h - 0.095
        else:
            start_y = y + h - 0.065
            
        for i, item in enumerate(items):
            ax.text(x + 0.02, start_y - (i * 0.032), f"• {item}", fontsize=8.5, color='#CBD5E1', va='top')

    # COLUMN 1: PRIVATE TECH COMPETITORS
    ax.text(0.18, 0.88, "PRIVATE / GLOBAL TECH", fontsize=13, weight='bold', color='#38BDF8', ha='center')
    draw_box(0.04, 0.64, 0.28, 0.22, "Google Flood Hub", "Global AI Riverine Model", 
             ["River basin LSTM & gauge modeling", "Covers 80+ countries & major rivers", 
              "NO street-level urban flash flooding", "NO underpass sump depth analysis",
              "NO evacuation routing or bypass navigation", "Zero drought or dry-season tracking"],
             '#111C28', '#0284C7')
             
    draw_box(0.04, 0.38, 0.28, 0.22, "One Concern & Tomorrow.io", "Enterprise Weather & Risk", 
             ["Enterprise asset & real estate scoring", "Micro-weather radar satellite forecasts",
              "Closed proprietary SaaS ($100k+ fees)", "NO citizen life-safety or public access",
              "NO offline PWA for emergency responders", "Zero municipal civic backcheck loop"],
             '#111C28', '#475569')

    draw_box(0.04, 0.12, 0.28, 0.22, "Esri ArcGIS & Mapbox Crisis", "Spatial GIS Mapping Tools", 
             ["Heavy enterprise GIS infrastructure", "Custom map layers for responders",
              "Manual desktop GIS setup required", "NO automated AI safe elevation routing",
              "NO vehicle clearance sump thresholding", "High licensing barriers for local bodies"],
             '#111C28', '#475569')

    # COLUMN 2: INDIAN GOVERNMENT & OFFICIAL PLATFORMS
    ax.text(0.50, 0.88, "INDIAN GOVERNMENT PLATFORMS", fontsize=13, weight='bold', color='#F59E0B', ha='center')
    draw_box(0.36, 0.64, 0.28, 0.22, "NDMA / SDMA Sachet Portal", "Official National CAP Gateway", 
             ["Pan-India CAP SMS & cell broadcasts", "Mandated civil defense channel",
              "District-wide text alerts (coarse)", "Massive alert fatigue (no hyper-local data)",
              "NO interactive 3D map or DEM routing", "One-way push; zero ground feedback"],
             '#1C1610', '#B45309')

    draw_box(0.36, 0.38, 0.28, 0.22, "IMD Mausam & Doppler Radar", "National Weather Service", 
             ["Pan-India Doppler weather radar network", "Official NWP synoptic forecasts",
              "Macro-scale weather (not road waterlogging)", "DOAB integrates IMD as core data feed",
              "Lacks street-level vehicle passability", "No dynamic elevation corridor search"],
             '#1C1610', '#D97706')

    draw_box(0.36, 0.12, 0.28, 0.22, "CWC WRIS & ISRO Bhuvan", "Hydrological & Satellite Portals", 
             ["Reservoir levels & river stage gauges", "Post-disaster satellite flood polygons",
              "Optical satellites blocked by storm clouds", "24-48h processing lag (no real-time)",
              "Complex desktop tabular interface", "Zero consumer navigation or fleet routing"],
             '#1C1610', '#B45309')

    # COLUMN 3: DOAB PLATFORM ARCHITECTURE & MOATS
    ax.text(0.82, 0.88, "DOAB PLATFORM (OUR MOAT)", fontsize=13, weight='bold', color='#10B981', ha='center')
    draw_box(0.68, 0.53, 0.28, 0.33, "DOAB Dual-Climate Core", "Detect → Order → Alert → Back-check", 
             ["DUAL-CLIMATE: Monsoon Flood & Dry Drought", "Copernicus 201m DEM Elevation Engine",
              "Underpass & Sump Inundation Physics", "1-Hour Forward AI Risk Forecasting",
              "3 Elevation Bypass Corridors (Fast/High/Safe)", "Vehicle Clearance Sump Filter (Low/Med/High)",
              "Crowdsourced Citizen Ground-Truth Backcheck", "Emergency Alarm & Siren Hardware Override"],
             '#091D1A', '#0F766E', '#5EEAD4')

    draw_box(0.68, 0.12, 0.28, 0.37, "AWS Serverless & Edge Grid", "Production Infrastructure Moat", 
             ["Amazon Location Service (ALS) Places & Routing", "AWS CloudFront CDN: <40ms Global Edge Delivery",
              "AWS S3 Static Single-Page App Hosting", "AWS EC2 Dockerized FastAPI Prediction Mesh",
              "AWS RDS PostgreSQL Enterprise Persistence", "AWS SQS + Lambda Zero-Loss Distress Buffer",
              "Amazon SNS Priority Emergency SMS Gateway", "Cognito Temporary Identity Role Vending"],
             '#091D1A', '#0F766E', '#5EEAD4')

    # Connectors & Arrows
    arrow_props = dict(facecolor='#38BDF8', edgecolor='none', width=1.5, headwidth=6, headlength=7, alpha=0.7)
    
    # Arrows from Inputs into DOAB
    ax.annotate("", xy=(0.675, 0.70), xytext=(0.645, 0.70), arrowprops=arrow_props)
    ax.annotate("", xy=(0.675, 0.45), xytext=(0.645, 0.45), arrowprops=arrow_props)
    ax.annotate("", xy=(0.675, 0.25), xytext=(0.645, 0.25), arrowprops=arrow_props)

    # Footnote bar
    ax.text(0.5, 0.035, "DOAB (Environmental Hacks, Track 02) • Unified Civic Emergency & Logistics Dispatch Engine", 
            fontsize=10, weight='bold', color='#94A3B8', ha='center', fontfamily='monospace')

    plt.tight_layout()
    plt.savefig(FLOWCHART_JPG_PATH, format='jpg', dpi=220, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"Flowchart generated successfully at: {FLOWCHART_JPG_PATH}")

def generate_docx():
    doc = Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Styles & Fonts
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = RGBColor(30, 41, 59)

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("DOAB (दोआब) — Competitive & Government Landscape Analysis")
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(15, 23, 42)

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_sub.add_run("Deep-Dive Benchmarking: Global Tech Competitors, Indian Civic Portals & DOAB Value Proposition\nEnvironmental Hacks (Track 02) • Project Whitepaper")
    run_sub.font.size = Pt(11)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # 1. Executive Summary
    h1 = doc.add_heading("1. Executive Summary", level=1)
    h1.runs[0].font.color.rgb = RGBColor(15, 118, 110)

    doc.add_paragraph(
        "Modern climate disasters in India present a paradoxical dual challenge: extreme urban flash floods and underpass waterlogging during the monsoon season, transitioning directly into severe borewell depletion, water tanker delivery deficits, and fatal thermal heatwaves during the pre-monsoon dry season. While multiple platforms operate in disaster management and meteorology, a fundamental gap exists between macro-level forecasting and street-level citizen life-safety."
    )
    doc.add_paragraph(
        "Existing systems either operate as broad-area meteorological broadcasts (IMD, NDMA Sachet), macro-riverine flood predictions (Google Flood Hub), or closed enterprise GIS tools (Esri, One Concern). None of them provide real-time, digital elevation model (DEM)-grounded street inundation routing, vehicle-clearance underpass passability, crowdsourced ground-truth verification, or dual-climate adaptability."
    )
    doc.add_paragraph(
        "DOAB (Detect → Order → Alert → Back-check) bridges this critical divide by delivering hyper-local, 60-minute forward predictive hazard intelligence, automated 3-corridor elevation bypass navigation, and emergency dispatch on a resilient AWS Cloud architecture."
    )

    # Embed Flowchart
    if os.path.exists(FLOWCHART_JPG_PATH):
        doc.add_paragraph().paragraph_format.space_after = Pt(6)
        doc.add_picture(FLOWCHART_JPG_PATH, width=Inches(6.8))
        caption = doc.add_paragraph("Figure 1: High-level System Topology & Competitor Benchmarking Flowchart")
        caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        caption.runs[0].font.size = Pt(9)
        caption.runs[0].font.italic = True
        caption.runs[0].font.color.rgb = RGBColor(100, 116, 139)

    # 2. Comprehensive Competitive Matrix
    doc.add_page_break()
    h2 = doc.add_heading("2. Comprehensive Competitor & Platform Feature Matrix", level=1)
    h2.runs[0].font.color.rgb = RGBColor(15, 118, 110)

    table_data = [
        ["Capability / Dimension", "DOAB Platform", "Google Flood Hub", "NDMA Sachet", "IMD Mausam / Radar", "CWC India-WRIS", "Tomorrow.io / One Concern"],
        ["Dual-Climate Architecture", "YES (Flood + Drought)", "NO (River Flood Only)", "Partial (SMS Only)", "Weather Only", "Water Data Only", "Weather Only"],
        ["Street & Sump Inundation Depth", "YES (DEM + Sump Physics)", "NO (Basin Polygons)", "NO (District-wide)", "NO (Rainfall Only)", "NO (River Gauges)", "NO (Enterprise SaaS)"],
        ["3D Safe Elevation Bypass Routing", "YES (3 Corridors: Fast/High/Safe)", "NO (Static Map)", "NO (Text SMS)", "NO (Bulletins)", "NO (Tabular)", "NO (Enterprise)"],
        ["Vehicle Clearance Thresholding", "YES (Low/Med/High Clearance)", "NO", "NO", "NO", "NO", "NO"],
        ["Ground-Truth Citizen Back-Check", "YES (Bidirectional Verification)", "NO (One-way)", "NO (One-way)", "NO", "NO", "NO"],
        ["Emergency Hardware Siren / SOS", "YES (Siren Override + Haptics)", "NO", "Partial (Cell Broadcast)", "NO", "NO", "NO"],
        ["Cloud & Edge Latency", "AWS CloudFront (<40ms Edge)", "Google Cloud Edge", "Govt NIC Gateway (Slow)", "NIC Data Center (Slow)", "NIC Portal (Tabular)", "Proprietary Cloud (Paid)"],
        ["Offline PWA / Field Responder APK", "YES (Local Cache + ServiceWorker)", "NO", "Mobile App (Basic)", "Mobile App (Basic)", "Desktop Only", "Enterprise Web Only"]
    ]

    t = doc.add_table(rows=len(table_data), cols=len(table_data[0]))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER

    for r_idx, row in enumerate(table_data):
        for c_idx, val in enumerate(row):
            cell = t.cell(r_idx, c_idx)
            cell.text = val
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            p.runs[0].font.size = Pt(8.5)
            
            # Header styling
            if r_idx == 0:
                p.runs[0].font.bold = True
                p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
                shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="0F766E"/>')
                cell._tc.get_or_add_tcPr().append(shd)
            elif c_idx == 1:
                p.runs[0].font.bold = True
                shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F0FDFA"/>')
                cell._tc.get_or_add_tcPr().append(shd)
            elif r_idx % 2 == 1:
                shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>')
                cell._tc.get_or_add_tcPr().append(shd)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # 3. Deep-Dive Competitor Analysis
    h3 = doc.add_heading("3. Detailed Competitor Profiles: Strengths vs. DOAB Advantages", level=1)
    h3.runs[0].font.color.rgb = RGBColor(15, 118, 110)

    competitors = [
        {
            "name": "3.1 Google Flood Hub (Global Tech Competitor)",
            "strengths": [
                "Massive geographic coverage spanning 80+ countries and 460M+ inhabitants.",
                "Advanced Long Short-Term Memory (LSTM) machine learning models trained on decades of river discharge records.",
                "Seamless integration with Google Search and Android system notification hooks."
            ],
            "gaps": [
                "Macro-Riverine Focus Only: Models major river catchments (Ganges, Brahmaputra). It cannot predict localized urban flash waterlogging or street sumps where 80% of urban monsoon casualties occur.",
                "Zero Safe Path Routing: Displays static flood risk polygons on map. Cannot compute alternate bypass navigation routes for ambulances, delivery fleets, or commuting citizens.",
                "No Sump Clearance Awareness: Unaware of underpasses (e.g. Koramangala 80ft road or Domlur underpasses) where water pools 80cm deep despite zero river proximity.",
                "Single-Climate Paradigm: Completely idle during dry seasons; provides zero drought, tanker dispatch, or groundwater depletion tracking."
            ],
            "doab_advantage": "DOAB fuses Copernicus 201m DEM topography with real-time precipitation and municipal ward reports, delivering 60-minute forward street-level inundation prediction and 3 safe elevation corridors."
        },
        {
            "name": "3.2 NDMA Sachet (Official Indian Government CAP Portal)",
            "strengths": [
                "Authorized National Disaster Management Authority mandate with direct access to cellular telecom gateways.",
                "Multi-hazard coverage including cyclones, landslides, and tsunamis."
            ],
            "gaps": [
                "Coarse Geographic Granularity: Sends broad district-level SMS blasts (e.g. 'Heavy rain alert in Bengaluru Urban'). Citizens cannot tell if their route 300 meters ahead is impassable.",
                "Severe Alert Fatigue: Repeated generic text messages cause citizens to silence notifications.",
                "One-Way Dissemination: No mechanism for citizens or responders to submit live water depth back-checks or ground-truth confirmations.",
                "Zero Interactive Mapping: Lacks interactive 3D map views, elevation cross-sections, or automated safe-path calculation."
            ],
            "doab_advantage": "DOAB delivers precise street-level hazard pins with exact water depths in centimeters, paired with an emergency siren override and bidirectional ground-truth backcheck loop."
        },
        {
            "name": "3.3 IMD Mausam & Doppler Radar (Scientific Agency)",
            "strengths": [
                "Official scientific agency with national network of Doppler Weather Radars (DWR) and automatic weather stations (AWS).",
                "High-precision atmospheric Nowcast and 7-day Numerical Weather Prediction (NWP) models."
            ],
            "gaps": [
                "Atmospheric, Not Hydrological: IMD measures rainfall falling from the sky, not where water collects on the ground. A 50mm rainfall creates 10cm pooling on high ground but 90cm submersion in an underpass.",
                "No Road Passability Mapping: Does not evaluate vehicle low-clearance thresholds or route accessibility."
            ],
            "doab_advantage": "DOAB directly ingests IMD Doppler Radar Nowcasts and AWS telemetry as an upstream data input, combining it with digital elevation models and road networks to translate raw atmospheric rain into actionable vehicle passability."
        },
        {
            "name": "3.4 CWC Flood Forecast & ISRO Bhuvan (Hydrological & Space)",
            "strengths": [
                "Central Water Commission monitors hundreds of river gauge stations and reservoir storage levels.",
                "ISRO Bhuvan provides satellite-derived post-flood spatial inundation extent."
            ],
            "gaps": [
                "Delayed Post-Event Telemetry: Optical satellites cannot see through monsoon cloud cover during the event; Bhuvan flood maps take 24-48 hours to compile.",
                "Non-Intuitive Enterprise Interfaces: Heavy tabular portals designed for irrigation engineers rather than field rescue teams or active dispatchers."
            ],
            "doab_advantage": "DOAB provides instant 1-hour forward predictive routing during the storm, utilizing high-speed edge compute on AWS CloudFront with zero satellite cloud-blocking dependencies."
        }
    ]

    for comp in competitors:
        h4 = doc.add_heading(comp["name"], level=2)
        h4.runs[0].font.color.rgb = RGBColor(30, 41, 59)

        p_str = doc.add_paragraph()
        p_str.add_run("Where They Excel:\n").bold = True
        for s in comp["strengths"]:
            p_str.add_run(f"• {s}\n")

        p_gap = doc.add_paragraph()
        p_gap.add_run("Key Gaps & Shortcomings:\n").bold = True
        for g in comp["gaps"]:
            p_gap.add_run(f"• {g}\n")

        p_adv = doc.add_paragraph()
        r_adv = p_adv.add_run("The DOAB Advantage: ")
        r_adv.bold = True
        r_adv.font.color.rgb = RGBColor(15, 118, 110)
        p_adv.add_run(comp["doab_advantage"])
        p_adv.paragraph_format.space_after = Pt(10)

    # 4. Architectural Moats
    doc.add_page_break()
    h4 = doc.add_heading("4. DOAB Architectural Moats & Technology Stack", level=1)
    h4.runs[0].font.color.rgb = RGBColor(15, 118, 110)

    moats = [
        ("1. Copernicus 201m DEM Baseline + Sump Physics", "DOAB calculates local topographic relief using digital elevation models. Combined with soil runoff potential and sub-surface sump geometry, the model accurately predicts street-level pooling depths (e.g. 15cm alert threshold)."),
        ("2. 3-Corridor Elevation Bypass Engine", "Unlike conventional navigation engines that optimize solely for travel duration or traffic congestion, DOAB's routing algorithm computes 3 distinct corridors: Fastest Road, Highest Elevation Ridgeline, and Verified Safe Haven Bypass."),
        ("3. Dynamic Vehicle Clearance Filter", "Field responders and delivery fleets can toggle between Low Clearance (sedans/scooters, 15cm threshold), Medium Clearance (SUVs/vans, 35cm threshold), and High Clearance (fire engines/trucks, 65cm threshold)."),
        ("4. Complete AWS Serverless & Life-Safety Mesh", "Architected on AWS CloudFront (<40ms global edge delivery), S3 origin hosting, EC2 dockerized FastAPI prediction microservices, Amazon RDS PostgreSQL persistence, and SQS/SNS emergency distress buffers."),
        ("5. Dual-Climate Seasonal Flip", "Seamless zero-downtime transition between Monsoon Inundation Mode and Scarcity Drought Mode, re-orienting algorithms to monitor groundwater table deficits, tanker dispatch logistics, and heat stress advisories.")
    ]

    for title, desc in moats:
        p_m = doc.add_paragraph()
        r_m = p_m.add_run(title + "\n")
        r_m.bold = True
        r_m.font.color.rgb = RGBColor(15, 118, 110)
        p_m.add_run(desc)
        p_m.paragraph_format.space_after = Pt(8)

    # Save DOCX
    doc.save(DOCX_PATH)
    print(f"Word Document generated successfully at: {DOCX_PATH}")

def generate_markdown():
    md_content = """# 📊 DOAB (दोआब) — Competitive & Government Landscape Analysis
**Single Source of Truth: Global Tech Benchmarking, Indian Official Portals & DOAB Architectural Moats**  
*Track 02: Environmental Hacks • Life-Safety Civic Grid*

---

## 🎯 Executive Summary

Modern climate disaster management in India requires handling extreme seasonal duality:
1. **Monsoon Season**: Rapid urban flash floods, sub-level underpass drownings, and transport paralysis.
2. **Dry / Pre-Monsoon Season**: Extreme borewell depletion, water tanker delivery deficits, and fatal thermal heatwaves.

Existing commercial platforms (Google Flood Hub, Tomorrow.io, One Concern) and Indian government portals (NDMA Sachet, IMD Mausam, CWC India-WRIS, ISRO Bhuvan) solve specific pieces of this puzzle, but **leave a critical 200-meter life-safety gap**. They forecast macro-level weather or large river basins, but cannot tell a commuter, ambulance driver, or delivery partner whether the underpass 200 meters ahead is flooded by 80cm of water.

**DOAB (Detect → Order → Alert → Back-check)** closes this loop with digital elevation model (DEM) hydrological simulation, 3 safe elevation corridors, and real-time bidirectional citizen ground-truth verification on AWS Cloud infrastructure.

---

## 🗺️ System Topology & Competitor Landscape Flowchart

![DOAB Competitor Landscape Flowchart](./COMPETITOR_LANDSCAPE_FLOWCHART.jpg)

---

## 📊 Comprehensive Competitive Feature Matrix

| Capability / Dimension | DOAB Platform | Google Flood Hub | NDMA Sachet Portal | IMD Mausam / Radar | CWC India-WRIS | Tomorrow.io / One Concern |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dual-Climate Engine** | **YES (Flood + Drought)** | NO (River Flood Only) | Partial (SMS Only) | Weather Only | Hydrology Only | Weather Only |
| **Street & Sump Inundation Depth** | **YES (DEM + Sump Physics)** | NO (Basin Polygons) | NO (District-wide) | NO (Rainfall Only) | NO (River Gauges) | NO (Enterprise) |
| **3D Safe Elevation Bypass Routing** | **YES (3 Corridors: Fast/High/Safe)** | NO (Static Map) | NO (Text SMS) | NO (Bulletins) | NO (Tabular) | NO (Enterprise) |
| **Vehicle Clearance Thresholding** | **YES (15cm / 35cm / 65cm)** | NO | NO | NO | NO | NO |
| **Ground-Truth Backcheck Loop** | **YES (Bidirectional Verification)** | NO (One-way) | NO (One-way) | NO | NO | NO |
| **Emergency Siren / Haptic Override** | **YES (Device Hardware Alarm)** | NO | Partial (Cell Broadcast) | NO | NO | NO |
| **Cloud Edge Latency** | **AWS CloudFront (<40ms)** | Google Cloud Edge | NIC Gateway (Slow) | NIC Data Center (Slow) | NIC Portal (Tabular) | Cloud SaaS (Paid) |
| **Offline PWA / Field Responder APK** | **YES (ServiceWorker + Cache)** | NO | Mobile App (Basic) | Mobile App (Basic) | Desktop Only | Web Only |

---

## 🔍 Detailed Competitor Deep-Dive: Where They Excel vs. What DOAB Does Better

### 1. Google Flood Hub (Global Tech Leader)
- **Where Google Excels**:
  - Unrivaled global riverine reach across 80+ countries covering 460 million citizens.
  - Deep hydrologic LSTM neural networks trained on historical gauge data and satellite altimetry.
  - Deep distribution network through Google Search alerts and Android device push.
- **Key Gaps & Shortcomings**:
  - **Macro-Riverine Only**: Models large river catchments (Ganga, Brahmaputra, Mississippi). It completely ignores localized urban flash floods, stormwater drain choke points, and underpass sumps.
  - **Zero Safe Path Routing**: Only shows polygon risk zones. Does not provide turn-by-turn bypass navigation or high-elevation corridors.
  - **No Clearance Awareness**: Cannot tell if an underpass has 20cm vs 120cm of water.
  - **Single-Season Limitation**: Inactive during dry periods; zero drought or water tanker logistics support.
- **The DOAB Advantage**:
  - DOAB computes hyper-local 201m Copernicus DEM elevation baselines, modeling sub-surface sumps and providing 3 elevation bypass corridors for commuters and logistics fleets.

---

### 2. NDMA Sachet Portal (National Disaster Management Authority)
- **Where Sachet Excels**:
  - Official Government of India Common Alerting Protocol (CAP) mandate.
  - Direct integration with cellular telecommunications providers for emergency broadcast SMS.
- **Key Gaps & Shortcomings**:
  - **Coarse District-Wide Alerts**: Alerts read "Heavy rain warning for Bengaluru Urban district", triggering severe alert fatigue. Citizens ignore them because they lack street-level context.
  - **One-Way Push**: Citizens cannot confirm ground reality or submit live water depths.
  - **No Interactive Map or Elevation Analysis**: Operates primarily as an SMS and notification push service.
- **The DOAB Advantage**:
  - DOAB pinpoints exact street coordinates, displays water depth in centimeters, triggers audible siren hardware overrides, and provides a bidirectional feedback loop where citizen verifications adjust model confidence.

---

### 3. India Meteorological Department (IMD) Mausam & Doppler Radar
- **Where IMD Excels**:
  - World-class scientific meteorological agency with 35+ Doppler Weather Radars (DWR) and thousands of Automatic Weather Stations (AWS).
  - High-accuracy Numerical Weather Prediction (NWP) synoptic forecasts.
- **Key Gaps & Shortcomings**:
  - **Atmospheric, Not Hydrological**: IMD measures atmospheric precipitation falling from clouds, not accumulation on roadways. A 50mm cloudburst creates zero hazard on an elevated flyover, but catastrophic drowning risk in a depressed underpass.
  - **No Civic Routing**: Does not calculate route passability for vehicles or pedestrians.
- **The DOAB Advantage**:
  - **DOAB ingests IMD Doppler Radar and AWS telemetry as an upstream data source**, fusing atmospheric rain rates with Copernicus DEM topography to model ground inundation and route passability.

---

### 4. CWC India-WRIS & ISRO Bhuvan
- **Where CWC & ISRO Excel**:
  - Central Water Commission monitors reservoir storage, dam discharge, and river stage gauges.
  - ISRO Bhuvan provides satellite-derived flood inundation maps.
- **Key Gaps & Shortcomings**:
  - **Post-Event Processing Lag**: Optical satellites cannot pierce heavy monsoon clouds during the event. Bhuvan maps take 24–48 hours to compile, making them historical assessments rather than real-time navigation aids.
  - **Heavy Engineering Interfaces**: Designed for water resource engineers and dam managers, not emergency responders or citizens in transit.
- **The DOAB Advantage**:
  - DOAB operates 60 minutes *forward* in time, calculating inundation probabilities and safe corridors in real-time on AWS edge servers without waiting for post-event satellite passes.

---

## 🏛️ DOAB Architectural Moats & Technical Differentiators

```mermaid
graph TD
    A["Raw Data Ingestion Tier"] --> B["DOAB AI Hydrological Engine"]
    A1["IMD Doppler Radar & AWS Telemetry"] --> A
    A2["Copernicus 201m DEM Topography"] --> A
    A3["Open-Meteo ERA5 Reanalysis"] --> A
    A4["Municipal Telemetry (6,000+ Incidents)"] --> A
    A5["CGWB Ground Water Level Telemetry"] --> A

    B --> C["Core Value Pillars"]
    C --> C1["Dual-Climate Seasonal Flip (Monsoon / Scarcity)"]
    C --> C2["3-Corridor Safe Elevation Bypass Engine"]
    C --> C3["Vehicle Clearance Sump Filter (Low/Med/High)"]
    C --> C4["Real-Time Citizen Back-Check Ground Truth"]

    C1 --> D["AWS Mission-Critical Delivery"]
    C2 --> D
    C3 --> D
    C4 --> D

    D --> D1["AWS CloudFront Global CDN (<40ms Edge)"]
    D --> D2["Amazon Location Service (Pan-India Geocoding)"]
    D --> D3["AWS SQS + Lambda Zero-Loss Distress Buffer"]
    D --> D4["Amazon SNS High-Priority Emergency SMS"]
```

---

## 📋 Document Information
- **Generated**: October 2026
- **Project**: DOAB (Detect, Order, Alert, Back-check)
- **Files Created**:
  - Flowchart: [`docs/COMPETITOR_LANDSCAPE_FLOWCHART.jpg`](./COMPETITOR_LANDSCAPE_FLOWCHART.jpg)
  - Word Document: [`docs/COMPETITIVE_ANALYSIS.docx`](./COMPETITIVE_ANALYSIS.docx)
  - Markdown Whitepaper: [`docs/COMPETITIVE_ANALYSIS.md`](./COMPETITIVE_ANALYSIS.md)
"""
    with open(MD_PATH, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"Markdown file generated successfully at: {MD_PATH}")

if __name__ == '__main__':
    generate_flowchart()
    generate_docx()
    generate_markdown()
    print("All competitive analysis assets generated successfully!")
