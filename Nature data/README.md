# Climate Data Analysis System with Google Earth Engine Integration

A comprehensive Python system for analyzing climate data for Indian districts, featuring direct Google Earth Engine API integration for automated data extraction and analysis.

## Features

- **🌍 Direct Google Earth Engine Integration**: Extract data directly from GEE without manual code execution
- **🌡️ Temperature Analysis**: Daily temperature data with rolling 30-year averages
- **🌧️ Rainfall Analysis**: Daily rainfall data with flood and drought assessment
- **🏔️ Elevation Analysis**: District-level elevation data for terrain classification
- **🔥 Heatwave Analysis**: IMD-compliant heatwave detection with terrain-specific criteria
- **🌊 Flood/Drought Assessment**: Comprehensive flood and drought analysis
- **📊 Automated Pipeline**: Complete end-to-end analysis workflow
- **⚙️ Flexible Configuration**: JSON-based configuration system
- **📝 Comprehensive Logging**: Detailed logging for debugging and monitoring

## Installation

### Prerequisites

1. **Python 3.7+**
2. **Google Earth Engine Account** (free registration at https://earthengine.google.com/)

### Setup

1. **Clone or download this repository**

2. **Install required packages:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Authenticate with Google Earth Engine:**
   ```bash
   earthengine authenticate
   ```
   Follow the authentication prompts in your browser.

## Quick Start

### Option 1: Automated Google Earth Engine Integration (Recommended)

```python
from main import ClimateDataAnalyzer

# Initialize the analyzer
analyzer = ClimateDataAnalyzer()

# Run complete analysis for all configured states
results = analyzer.run_complete_analysis_from_gee()

# Or specify custom parameters
results = analyzer.run_complete_analysis_from_gee(
    states=['Maharashtra', 'Gujarat'],
    start_date='2020-01-01',
    end_date='2023-12-31',
    save_intermediate=True
)

# Access results
heatwave_data = results['heatwave']
flood_data = results['flood']
drought_data = results['drought']
```

### Option 2: Manual Data Extraction

If you prefer to extract data manually using Google Earth Engine Code Editor:

1. **Generate JavaScript code files:**
   ```python
   from main import ClimateDataAnalyzer
   
   analyzer = ClimateDataAnalyzer(initialize_gee=False)
   gee_codes = analyzer.generate_google_earth_code()
   ```

2. **Run the generated JavaScript files in Google Earth Engine Code Editor**

3. **Download CSV files and run analysis:**
   ```python
   results = analyzer.run_complete_analysis(
       temp_file='data/temperature_data.csv',
       rainfall_file='data/rainfall_data.csv',
       elevation_file='data/elevation_data.csv'
   )
   ```

## Configuration

Create a `config.json` file to customize the analysis:

```json
{
    "data_directory": "./data",
    "google_earth_engine_project": "your-project-id",
    "states_to_process": [
        "Bihar", "Gujarat", "Haryana", "Himachal Pradesh", 
        "Jharkhand", "Kerala", "Manipur", "Odisha", 
        "Telangana", "Tripura", "Uttar Pradesh", 
        "Uttarakhand", "West Bengal"
    ],
    "analysis_period": {
        "start": "1967-01-01",
        "end": "2025-08-20"
    },
    "study_period": {
        "start": "1997-01-01",
        "end": "2025-08-19"
    }
}
```

## Analysis Methods

### Individual Data Extraction

```python
# Extract temperature data
temp_data = analyzer.extract_temperature_data(
    states=['Maharashtra'],
    start_date='2020-01-01',
    end_date='2023-12-31'
)

# Extract rainfall data
rainfall_data = analyzer.extract_rainfall_data(
    states=['Maharashtra'],
    start_date='2020-01-01',
    end_date='2023-12-31'
)

# Extract elevation data
elevation_data = analyzer.extract_elevation_data(
    states=['Maharashtra']
)
```

### Analysis Components

1. **Terrain Classification**: Automatically classifies districts as coastal, hilly, or plains based on elevation
2. **Rolling 30-year Averages**: Calculates climatological baselines for temperature analysis
3. **Heatwave Analysis**: IMD-compliant heatwave detection with terrain-specific thresholds
4. **Flood Analysis**: Rainfall intensity classification (heavy, very heavy, extremely heavy)
5. **Drought Analysis**: Monsoon rainfall departure analysis from 30-year LPA

## Output Files

The system generates several output files:

- **Heatwave Analysis**: `heatwave_analysis_YYYYMMDD_HHMMSS.csv`
- **Flood Analysis**: `flood_analysis_YYYYMMDD_HHMMSS.csv`
- **Drought Analysis**: `drought_analysis_YYYYMMDD_HHMMSS.csv`
- **Temperature Data**: `rolling_temperature_YYYYMMDD_HHMMSS.csv`
- **Intermediate Data**: Raw extracted data (if `save_intermediate=True`)

## Data Sources

- **Temperature**: ERA5-Land Daily Aggregated (ECMWF)
- **Rainfall**: ERA5-Land Daily Aggregated (ECMWF)
- **Elevation**: SRTM DEM (USGS)
- **Administrative Boundaries**: GAUL 2024 Level 2 (FAO)

## IMD Heatwave Criteria

The system implements official IMD heatwave criteria:

- **Plains**: ≥40°C for 2 consecutive days
- **Hilly**: ≥30°C for 2 consecutive days
- **Coastal**: ≥37°C for 2 consecutive days
- **Severe Heatwave**: Above thresholds + mean temperature departure >6.4°C

## Rainfall Classification

- **Heavy Rain**: 64.5-115.5 mm
- **Very Heavy Rain**: 115.6-204.4 mm
- **Extremely Heavy Rain**: ≥204.5 mm

## Drought Classification

- **Severe Drought**: ≤-60% departure from LPA
- **Moderate Drought**: -20% to -60% departure
- **Normal**: -19% to +19% departure
- **Excess Rainfall**: ≥+20% departure

## Error Handling

The system includes comprehensive error handling:

- **GEE Authentication**: Automatic detection and guidance
- **Data Validation**: Robust data type checking and conversion
- **API Limits**: Graceful handling of GEE API limitations
- **Logging**: Detailed logging for debugging and monitoring

## Examples

### Complete Analysis for Maharashtra

```python
from main import ClimateDataAnalyzer

# Initialize analyzer
analyzer = ClimateDataAnalyzer()

# Run analysis for Maharashtra only
results = analyzer.run_complete_analysis_from_gee(
    states=['Maharashtra'],
    start_date='2020-01-01',
    end_date='2023-12-31'
)

# Print summary
print(f"Heatwave days: {len(results['heatwave'])}")
print(f"Flood events: {len(results['flood'])}")
print(f"Drought events: {len(results['drought'])}")
```

### Custom Configuration

```python
# Create custom configuration
config = {
    'states_to_process': ['Maharashtra', 'Gujarat'],
    'analysis_period': {
        'start': '2020-01-01',
        'end': '2023-12-31'
    }
}

# Save configuration
import json
with open('custom_config.json', 'w') as f:
    json.dump(config, f)

# Use custom configuration
analyzer = ClimateDataAnalyzer('custom_config.json')
results = analyzer.run_complete_analysis_from_gee()
```

## Troubleshooting

### Common Issues

1. **GEE Authentication Error**: Run `earthengine authenticate`
2. **Memory Issues**: Reduce the number of states or date range
3. **API Limits**: GEE has daily quotas; wait and retry
4. **Data Not Found**: Check state names and date ranges

### Support

For issues and questions:
1. Check the logs for detailed error messages
2. Verify GEE authentication status
3. Ensure all required packages are installed
4. Check internet connectivity for GEE API calls

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

**Note**: This system requires a Google Earth Engine account and proper authentication. The GEE API has usage quotas and terms of service that must be followed.
