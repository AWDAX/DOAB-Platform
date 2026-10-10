#!/usr/bin/env python3
"""
Comprehensive Climate Data Analysis System for Indian Districts
Integrates Google Earth Engine data extraction, terrain classification, 
heatwave analysis, and flood/drought assessment.

Based on the workflow described in Dataflow.txt and all referenced files.
"""

import pandas as pd
import numpy as np
import sqlite3
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Union
import logging
from pathlib import Path

# Google Earth Engine imports
try:
    import ee
    GEE_AVAILABLE = True
except ImportError:
    GEE_AVAILABLE = False
    print("Google Earth Engine not available. Install with: pip install earthengine-api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ClimateDataAnalyzer:
    """
    Main class for comprehensive climate data analysis including:
    - Google Earth Engine data extraction
    - Terrain classification
    - Rolling 30-year averages calculation
    - Heatwave analysis (IMD criteria)
    - Flood and drought assessment
    """
    
    def __init__(self, config_file: Optional[str] = None, initialize_gee: bool = True):
        """Initialize the analyzer with configuration."""
        self.config = self._load_config(config_file)
        self.data_dir = Path(self.config.get('data_directory', './data'))
        self.data_dir.mkdir(exist_ok=True)
        
        # Initialize Google Earth Engine if available
        self.gee_initialized = False
        if initialize_gee and GEE_AVAILABLE:
            self._initialize_google_earth_engine()
        elif initialize_gee and not GEE_AVAILABLE:
            logger.warning("Google Earth Engine not available. Install with: pip install earthengine-api")
        
        # Terrain classification thresholds
        self.elevation_thresholds = {
            'coastal_max': 100,
            'plains_max': 400
        }
        
        # IMD Heatwave criteria
        self.heatwave_criteria = {
            'plains': {'temp_threshold': 40, 'departure_threshold': 6.4},
            'hilly': {'temp_threshold': 30, 'departure_threshold': 6.4},
            'coastal': {'temp_threshold': 37, 'departure_threshold': 6.4}
        }
        
        # Rainfall classification thresholds (mm)
        self.rainfall_thresholds = {
            'heavy_rain': (64.5, 115.5),
            'very_heavy_rain': (115.6, 204.4),
            'extremely_heavy_rain': (204.5, float('inf'))
        }
        
        # Drought classification thresholds (%)
        self.drought_thresholds = {
            'severe_drought': -60,
            'moderate_drought': -20,
            'excess_rainfall': 20
        }
        
        logger.info("ClimateDataAnalyzer initialized successfully")
    
    def _initialize_google_earth_engine(self):
        """Initialize Google Earth Engine API."""
        try:
            # Project id comes from the environment or a local config file, never a baked-in id.
            project_id = self.config.get('google_earth_engine_project') or os.environ.get('GEE_PROJECT_ID')
            if not project_id:
                logger.warning("GEE_PROJECT_ID is not set. Earth Engine was not initialised.")
                return
            ee.Initialize(project=project_id)
            self.gee_initialized = True
            logger.info(f"Google Earth Engine initialized successfully with project: {project_id}")
        except Exception as e:
            logger.error(f"Failed to initialize Google Earth Engine: {str(e)}")
            logger.info("Please authenticate first by running: earthengine authenticate")
            self.gee_initialized = False
    
    def _load_config(self, config_file: Optional[str]) -> Dict:
        """Load configuration from file or use defaults."""
        default_config = {
            'data_directory': './data',
            'google_earth_engine_project': os.environ.get('GEE_PROJECT_ID', ''),
            'states_to_process': [
                'Bihar', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
                'Kerala', 'Manipur', 'Odisha', 'Telangana', 'Tripura',
                'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
            ],
            'analysis_period': {
                'start': '1967-01-01',
                'end': '2025-08-20'
            },
            'study_period': {
                'start': '1997-01-01',
                'end': '2025-08-19'
            }
        }
        
        if config_file and os.path.exists(config_file):
            with open(config_file, 'r') as f:
                user_config = json.load(f)
                default_config.update(user_config)
        
        return default_config
    
    def generate_google_earth_code(self) -> Dict[str, str]:
        """
        Generate Google Earth Engine JavaScript code for data extraction.
        Returns dictionary with code for temperature, rainfall, and elevation extraction.
        """
        
        # Temperature extraction code (from DataExtraction.js)
        temperature_code = f"""
// District-wise Daily Temperature (Mean, Min, Max)
// Source: ERA5-Land Daily Aggregated (ECMWF)
// Period: {self.config['analysis_period']['start']} to {self.config['analysis_period']['end']}

var START = '{self.config['analysis_period']['start']}';
var END   = '{self.config['analysis_period']['end']}';
var SCALE_METERS = 9000;
var TILE_SCALE = 4;

var STATES = {json.dumps(self.config['states_to_process'])};

var gaul2_2024 = ee.FeatureCollection("projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2");

var era = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
  .filterDate(START, END)
  .select(['temperature_2m','temperature_2m_min','temperature_2m_max']);

function toCelsius(img) {{
  var meanC = img.select('temperature_2m').subtract(273.15).rename('t2m_mean_C');
  var minC  = img.select('temperature_2m_min').subtract(273.15).rename('t2m_min_C');
  var maxC  = img.select('temperature_2m_max').subtract(273.15).rename('t2m_max_C');
  return meanC.addBands([minC, maxC]).copyProperties(img, img.propertyNames());
}}
var eraC = era.map(toCelsius);

function zonalStats(img, districts) {{
  var date = img.date().format('YYYY-MM-dd');
  var stats = img.reduceRegions({{
    collection: districts,
    reducer: ee.Reducer.mean(),
    scale: SCALE_METERS,
    tileScale: TILE_SCALE
  }}).map(function(f) {{
    return f.set('date', date);
  }});
  return stats;
}}

STATES.forEach(function(state) {{
  var districts = gaul2_2024.filter(ee.Filter.eq('gaul1_name', state));
  print('Processing:', state, '| Districts:', districts.size());

  var perDayPerDistrict = eraC.map(function(img) {{
    return zonalStats(img, districts);
  }}).flatten();

  Export.table.toDrive({{
    collection: perDayPerDistrict,
    description: 'ERA5Land_DailyTemp_' + state.replace(/\\s+/g, '_') + '_1967_2025',
    fileFormat: 'CSV',
    selectors: ['gaul2_name','gaul2_code','date','t2m_mean_C','t2m_min_C','t2m_max_C']
  }});
}});
"""
        
        # Rainfall extraction code (from RAINFALL.js)
        rainfall_code = f"""
// District-wise Daily Total Rainfall (mm)
// Source: ERA5-Land Daily Aggregated (ECMWF)
// Period: 1966-01-01 to today

var START = '1966-01-01';
var END   = ee.Date(Date.now());
var SCALE_METERS = 9000;
var TILE_SCALE = 4;

var targetStates = {json.dumps(self.config['states_to_process'])};

var gaul2_2024 = ee.FeatureCollection("projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2");

var era = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
  .filterDate(START, END)
  .select('total_precipitation_sum');

function dailyRainfall(img, districts) {{
  var date = ee.Date(img.get('system:time_start'));
  
  var stats = img.reduceRegions({{
    collection: districts,
    reducer: ee.Reducer.sum(),
    scale: SCALE_METERS,
    tileScale: TILE_SCALE
  }}).map(function(f) {{
    var rain_mm = ee.Number(f.get('sum')).multiply(1000);
    return f.set({{
      'date': date.format('YYYY-MM-dd'),
      'precip_mm_total': rain_mm
    }});
  }});
  
  return stats;
}}

targetStates.forEach(function(stateName) {{
  var stateDistricts = gaul2_2024.filter(ee.Filter.eq('gaul1_name', stateName));
  
  Map.addLayer(stateDistricts, {{}}, stateName);
  
  var dailyStats = era.map(function(img) {{
    return dailyRainfall(img, stateDistricts);
  }}).flatten();
  
  Export.table.toDrive({{
    collection: dailyStats,
    description: stateName.replace(/\\s/g, '') + '_DailyTotalRainfall_1966_Today',
    fileFormat: 'CSV',
    selectors: ['gaul1_name','gaul2_name','gaul2_code','date','precip_mm_total']
  }});
}});
"""
        
        # Elevation extraction code (from GoogleEarthCode.js)
        elevation_code = """
// District-wise Average Elevation
// Source: SRTM DEM

var districts = ee.FeatureCollection("projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2")
                 .filter(ee.Filter.eq('gaul0_name', 'India'));

var srtm = ee.Image("USGS/SRTMGL1_003");
var srtm_land = srtm.updateMask(srtm.gte(0));

var districtsElevationStats = districts.map(function(feature) {
  var stats = srtm_land.reduceRegion({
    reducer: ee.Reducer.mean()
                 .combine({reducer2: ee.Reducer.min(), sharedInputs: true})
                 .combine({reducer2: ee.Reducer.max(), sharedInputs: true}),
    geometry: feature.geometry(),
    scale: 30,
    maxPixels: 1e13
  });

  var minElev = ee.Number(stats.get('elevation_min')).max(0);

  return feature.set({
    'state_name': feature.get('gaul1_name'),
    'district_name': feature.get('gaul2_name'),
    'avg_elev_m': stats.get('elevation_mean'),
    'min_elev_m': minElev,
    'max_elev_m': stats.get('elevation_max')
  });
});

var exportTable = districtsElevationStats.select(['state_name', 'district_name', 'avg_elev_m']);

Export.table.toDrive({
  collection: exportTable,
  description: 'India_District_Avg_Elevation_GAUL2024',
  fileFormat: 'CSV'
});

print(exportTable.limit(10));
"""
        
        return {
            'temperature': temperature_code,
            'rainfall': rainfall_code,
            'elevation': elevation_code
        }
    
    def extract_temperature_data(self, states: Optional[List[str]] = None, 
                                start_date: Optional[str] = None, 
                                end_date: Optional[str] = None) -> pd.DataFrame:
        """
        Extract temperature data directly from Google Earth Engine.
        
        Args:
            states: List of states to process (default: from config)
            start_date: Start date in YYYY-MM-DD format (default: from config)
            end_date: End date in YYYY-MM-DD format (default: from config)
            
        Returns:
            DataFrame with temperature data
        """
        if not self.gee_initialized:
            raise RuntimeError("Google Earth Engine not initialized. Please authenticate first.")
        
        states = states or self.config['states_to_process']
        start_date = start_date or self.config['analysis_period']['start']
        end_date = end_date or self.config['analysis_period']['end']
        
        logger.info(f"Extracting temperature data for {len(states)} states from {start_date} to {end_date}")
        
        # Load GAUL 2024 districts
        gaul2_2024 = ee.FeatureCollection("projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2")
        
        # Load ERA5-Land temperature data
        era = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR') \
            .filterDate(start_date, end_date) \
            .select(['temperature_2m', 'temperature_2m_min', 'temperature_2m_max'])
        
        # Convert from Kelvin to Celsius
        def to_celsius(img):
            mean_c = img.select('temperature_2m').subtract(273.15).rename('t2m_mean_C')
            min_c = img.select('temperature_2m_min').subtract(273.15).rename('t2m_min_C')
            max_c = img.select('temperature_2m_max').subtract(273.15).rename('t2m_max_C')
            return mean_c.addBands([min_c, max_c]).copyProperties(img, img.propertyNames())
        
        era_celsius = era.map(to_celsius)
        
        # Process each state
        all_data = []
        
        for state in states:
            logger.info(f"Processing state: {state}")
            
            # Filter districts for this state
            state_districts = gaul2_2024.filter(ee.Filter.eq('gaul1_name', state))
            
            # Calculate zonal statistics for each day
            def zonal_stats(img):
                date = img.date().format('YYYY-MM-dd')
                stats = img.reduceRegions(
                    collection=state_districts,
                    reducer=ee.Reducer.mean(),
                    scale=9000,
                    tileScale=4
                ).map(lambda f: f.set('date', date))
                return stats
            
            # Apply to all images
            daily_stats = era_celsius.map(zonal_stats).flatten()
            
            # Convert to pandas DataFrame
            try:
                # Get the data as a list
                data_list = daily_stats.getInfo()
                
                # Convert to DataFrame
                if data_list:
                    df = pd.DataFrame(data_list)
                    df = df.rename(columns={
                        'gaul2_name': 'district',
                        'date': 'date_t',
                        't2m_mean_C': 'mean_temp',
                        't2m_min_C': 'min_temp',
                        't2m_max_C': 'max_temp'
                    })
                    all_data.append(df)
                    logger.info(f"Extracted {len(df)} records for {state}")
                else:
                    logger.warning(f"No data found for {state}")
                    
            except Exception as e:
                logger.error(f"Error processing {state}: {str(e)}")
                continue
        
        if not all_data:
            raise RuntimeError("No temperature data extracted")
        
        # Combine all state data
        combined_df = pd.concat(all_data, ignore_index=True)
        
        # Convert date column
        combined_df['date_t'] = pd.to_datetime(combined_df['date_t'])
        
        # Ensure numeric columns
        for col in ['mean_temp', 'max_temp', 'min_temp']:
            combined_df[col] = pd.to_numeric(combined_df[col], errors='coerce')
        
        logger.info(f"Successfully extracted {len(combined_df)} temperature records")
        return combined_df
    
    def extract_rainfall_data(self, states: Optional[List[str]] = None,
                             start_date: Optional[str] = None,
                             end_date: Optional[str] = None) -> pd.DataFrame:
        """
        Extract rainfall data directly from Google Earth Engine.
        
        Args:
            states: List of states to process (default: from config)
            start_date: Start date in YYYY-MM-DD format (default: 1966-01-01)
            end_date: End date in YYYY-MM-DD format (default: today)
            
        Returns:
            DataFrame with rainfall data
        """
        if not self.gee_initialized:
            raise RuntimeError("Google Earth Engine not initialized. Please authenticate first.")
        
        states = states or self.config['states_to_process']
        start_date = start_date or '1966-01-01'
        end_date = end_date or datetime.now().strftime('%Y-%m-%d')
        
        logger.info(f"Extracting rainfall data for {len(states)} states from {start_date} to {end_date}")
        
        # Load GAUL 2024 districts
        gaul2_2024 = ee.FeatureCollection("projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2")
        
        # Load ERA5-Land precipitation data
        era = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR') \
            .filterDate(start_date, end_date) \
            .select('total_precipitation_sum')
        
        # Process each state
        all_data = []
        
        for state in states:
            logger.info(f"Processing state: {state}")
            
            # Filter districts for this state
            state_districts = gaul2_2024.filter(ee.Filter.eq('gaul1_name', state))
            
            # Calculate daily rainfall (convert m to mm)
            def daily_rainfall(img):
                date = ee.Date(img.get('system:time_start'))
                
                stats = img.reduceRegions(
                    collection=state_districts,
                    reducer=ee.Reducer.sum(),
                    scale=9000,
                    tileScale=4
                ).map(lambda f: f.set({
                    'date': date.format('YYYY-MM-dd'),
                    'precip_mm_total': ee.Number(f.get('sum')).multiply(1000)
                }))
                
                return stats
            
            # Apply to all images
            daily_stats = era.map(daily_rainfall).flatten()
            
            # Convert to pandas DataFrame
            try:
                # Get the data as a list
                data_list = daily_stats.getInfo()
                
                # Convert to DataFrame
                if data_list:
                    df = pd.DataFrame(data_list)
                    df = df.rename(columns={
                        'gaul2_name': 'district',
                        'date': 'date_r',
                        'precip_mm_total': 'totals'
                    })
                    all_data.append(df)
                    logger.info(f"Extracted {len(df)} records for {state}")
                else:
                    logger.warning(f"No data found for {state}")
                    
            except Exception as e:
                logger.error(f"Error processing {state}: {str(e)}")
                continue
        
        if not all_data:
            raise RuntimeError("No rainfall data extracted")
        
        # Combine all state data
        combined_df = pd.concat(all_data, ignore_index=True)
        
        # Convert date column
        combined_df['date_r'] = pd.to_datetime(combined_df['date_r'])
        
        # Ensure numeric columns
        combined_df['totals'] = pd.to_numeric(combined_df['totals'], errors='coerce')
        
        logger.info(f"Successfully extracted {len(combined_df)} rainfall records")
        return combined_df
    
    def extract_elevation_data(self, states: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Extract elevation data directly from Google Earth Engine.
        
        Args:
            states: List of states to process (default: all Indian states)
            
        Returns:
            DataFrame with elevation data
        """
        if not self.gee_initialized:
            raise RuntimeError("Google Earth Engine not initialized. Please authenticate first.")
        
        logger.info("Extracting elevation data for Indian districts")
        
        # Load GAUL 2024 districts for India
        if states:
            gaul2_2024 = ee.FeatureCollection("projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2") \
                .filter(ee.Filter.inList('gaul1_name', states))
        else:
            gaul2_2024 = ee.FeatureCollection("projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2") \
                .filter(ee.Filter.eq('gaul0_name', 'India'))
        
        # Load SRTM DEM
        srtm = ee.Image("USGS/SRTMGL1_003")
        srtm_land = srtm.updateMask(srtm.gte(0))
        
        # Calculate elevation statistics for each district
        def calc_elevation_stats(feature):
            stats = srtm_land.reduceRegion(
                reducer=ee.Reducer.mean()
                    .combine(ee.Reducer.min(), sharedInputs=True)
                    .combine(ee.Reducer.max(), sharedInputs=True),
                geometry=feature.geometry(),
                scale=30,
                maxPixels=1e13
            )
            
            min_elev = ee.Number(stats.get('elevation_min')).max(0)
            
            return feature.set({
                'state_name': feature.get('gaul1_name'),
                'district_name': feature.get('gaul2_name'),
                'avg_elev_m': stats.get('elevation_mean'),
                'min_elev_m': min_elev,
                'max_elev_m': stats.get('elevation_max')
            })
        
        elevation_stats = gaul2_2024.map(calc_elevation_stats)
        
        # Convert to pandas DataFrame
        try:
            data_list = elevation_stats.getInfo()
            
            if data_list and len(data_list) > 0:
                # Handle the case where data_list might be a single dict or list of dicts
                if isinstance(data_list, dict):
                    data_list = [data_list]
                
                df = pd.DataFrame(data_list)
                
                # Rename columns if they exist
                if 'district_name' in df.columns:
                    df = df.rename(columns={'district_name': 'district'})
                if 'avg_elev_m' in df.columns:
                    df = df.rename(columns={'avg_elev_m': 'avg_elevation'})
                
                # Ensure numeric columns
                if 'avg_elevation' in df.columns:
                    df['avg_elevation'] = pd.to_numeric(df['avg_elevation'], errors='coerce')
                
                logger.info(f"Successfully extracted elevation data for {len(df)} districts")
                return df
            else:
                raise RuntimeError("No elevation data extracted")
                
        except Exception as e:
            logger.error(f"Error extracting elevation data: {str(e)}")
            raise
    
    def classify_terrain(self, district: str, avg_elevation: float, is_coastal: bool = False) -> str:
        """
        Classify terrain based on elevation and coastal status.
        Based on excel-formula.txt logic.
        """
        if is_coastal:
            if avg_elevation < self.elevation_thresholds['coastal_max']:
                return 'coastal'
            elif avg_elevation < self.elevation_thresholds['plains_max']:
                return 'plains'
            else:
                return 'hilly'
        else:
            if avg_elevation < self.elevation_thresholds['plains_max']:
                return 'plains'
            else:
                return 'hilly'
    
    def load_temperature_data(self, file_path: str) -> pd.DataFrame:
        """Load and preprocess temperature data."""
        logger.info(f"Loading temperature data from {file_path}")
        
        df = pd.read_csv(file_path)
        
        # Rename columns to standard format
        column_mapping = {
            'gaul2_name': 'district',
            'date': 'date_t',
            't2m_mean_C': 'mean_temp',
            't2m_min_C': 'min_temp',
            't2m_max_C': 'max_temp'
        }
        
        df = df.rename(columns=column_mapping)
        
        # Convert date column
        df['date_t'] = pd.to_datetime(df['date_t'], errors='coerce')
        
        # Ensure numeric columns
        for col in ['mean_temp', 'max_temp', 'min_temp']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Add terrain classification (placeholder - will be updated with elevation data)
        df['terrain'] = 'plains'  # Default, will be updated
        
        return df
    
    def load_rainfall_data(self, file_path: str) -> pd.DataFrame:
        """Load and preprocess rainfall data."""
        logger.info(f"Loading rainfall data from {file_path}")
        
        df = pd.read_csv(file_path)
        
        # Rename columns to standard format
        column_mapping = {
            'gaul2_name': 'district',
            'date': 'date_r',
            'precip_mm_total': 'totals'
        }
        
        df = df.rename(columns=column_mapping)
        
        # Convert date column
        df['date_r'] = pd.to_datetime(df['date_r'], errors='coerce')
        
        # Ensure numeric columns
        df['totals'] = pd.to_numeric(df['totals'], errors='coerce')
        
        return df
    
    def load_elevation_data(self, file_path: str) -> pd.DataFrame:
        """Load elevation data."""
        logger.info(f"Loading elevation data from {file_path}")
        
        df = pd.read_csv(file_path)
        
        # Rename columns to standard format
        column_mapping = {
            'district_name': 'district',
            'avg_elev_m': 'avg_elevation'
        }
        
        df = df.rename(columns=column_mapping)
        
        # Ensure numeric columns
        df['avg_elevation'] = pd.to_numeric(df['avg_elevation'], errors='coerce')
        
        return df
    
    def calculate_rolling_30year_averages(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate rolling 30-year same-day averages for temperature data.
        Based on 30yearsaverage.py logic.
        """
        logger.info("Calculating rolling 30-year same-day averages")
        
        # Extract date parts
        df['month'] = df['date_t'].dt.month
        df['day'] = df['date_t'].dt.day
        df['year'] = df['date_t'].dt.year
        
        results = []
        
        for district, sub in df.groupby('district'):
            sub = sub.sort_values('date_t').reset_index(drop=True)
            
            for idx, row in sub.iterrows():
                target_year = row['year']
                month = row['month']
                day = row['day']
                
                # Same-day temps from 30 years prior (exclude current year)
                mask = (
                    (sub['month'] == month) &
                    (sub['day'] == day) &
                    (sub['year'].between(target_year - 30, target_year - 1))
                )
                past_30yrs = sub.loc[mask, 'mean_temp']
                
                avg_temp_30yr = past_30yrs.mean() if not past_30yrs.empty else None
                
                # Next day max_temp
                next_day_max = None
                if idx + 1 < len(sub):
                    next_day_max = sub.loc[idx + 1, 'max_temp']
                
                results.append({
                    'date_t': row['date_t'],
                    'district': district,
                    'terrain': row['terrain'],
                    'mean_temp': row['mean_temp'],
                    'min_temp': row['min_temp'],
                    'max_temp': row['max_temp'],
                    'avg_temp_30yr': avg_temp_30yr,
                    'next_day_max': next_day_max
                })
        
        rolling_df = pd.DataFrame(results)
        
        # Filter final study period
        start_date = self.config['study_period']['start']
        end_date = self.config['study_period']['end']
        rolling_df = rolling_df[
            (rolling_df['date_t'] >= start_date) &
            (rolling_df['date_t'] <= end_date)
        ]
        
        logger.info(f"Rolling averages calculated for {len(rolling_df)} records")
        return rolling_df
    
    def analyze_heatwaves(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Analyze heatwaves based on IMD criteria.
        Based on FINAL-ANALYSIS-SQL.txt logic.
        """
        logger.info("Analyzing heatwaves using IMD criteria")
        
        def classify_heatwave(row):
            terrain = row['terrain'].lower()
            max_temp = row['max_temp']
            next_day_max = row['next_day_max']
            mean_temp = row['mean_temp']
            avg_temp_30yr = row['avg_temp_30yr']
            
            if pd.isna(max_temp) or pd.isna(next_day_max) or pd.isna(mean_temp) or pd.isna(avg_temp_30yr):
                return 'Normal'
            
            criteria = self.heatwave_criteria[terrain]
            temp_threshold = criteria['temp_threshold']
            departure_threshold = criteria['departure_threshold']
            
            # Check for consecutive days above threshold
            if max_temp >= temp_threshold and next_day_max >= temp_threshold:
                # Check for severe heatwave (departure > threshold)
                if mean_temp - avg_temp_30yr > departure_threshold:
                    return 'Severe Heatwave'
                else:
                    return 'Heatwave'
            
            return 'Normal'
        
        df['heatwave_type'] = df.apply(classify_heatwave, axis=1)
        
        # Aggregate by district and year
        df['year'] = df['date_t'].dt.year
        
        heatwave_summary = df.groupby(['district', 'terrain', 'year']).agg({
            'heatwave_type': lambda x: (x == 'Heatwave').sum(),
            'heatwave_type': lambda x: (x == 'Severe Heatwave').sum()
        }).reset_index()
        
        # Rename columns for clarity
        heatwave_summary.columns = ['district', 'terrain', 'year', 'heatwave_days', 'severe_heatwave_days']
        heatwave_summary['frequency'] = heatwave_summary['heatwave_days'] + heatwave_summary['severe_heatwave_days']
        
        logger.info(f"Heatwave analysis completed for {len(heatwave_summary)} district-year combinations")
        return heatwave_summary
    
    def analyze_floods(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Analyze flood events based on rainfall thresholds.
        Based on FLOODS-SQL.txt logic.
        """
        logger.info("Analyzing flood events based on rainfall thresholds")
        
        # Filter data for study period
        start_date = self.config['study_period']['start']
        end_date = self.config['study_period']['end']
        df_filtered = df[
            (df['date_r'] >= start_date) &
            (df['date_r'] <= end_date) &
            (df['totals'].notna())
        ].copy()
        
        # Classify rainfall intensity
        df_filtered['heavy_rain'] = (
            (df_filtered['totals'] >= self.rainfall_thresholds['heavy_rain'][0]) &
            (df_filtered['totals'] <= self.rainfall_thresholds['heavy_rain'][1])
        ).astype(int)
        
        df_filtered['very_heavy_rain'] = (
            (df_filtered['totals'] >= self.rainfall_thresholds['very_heavy_rain'][0]) &
            (df_filtered['totals'] <= self.rainfall_thresholds['very_heavy_rain'][1])
        ).astype(int)
        
        df_filtered['extremely_heavy_rain'] = (
            df_filtered['totals'] >= self.rainfall_thresholds['extremely_heavy_rain'][0]
        ).astype(int)
        
        # Aggregate by district and year
        df_filtered['year'] = df_filtered['date_r'].dt.year
        
        flood_summary = df_filtered.groupby(['district', 'year']).agg({
            'heavy_rain': 'sum',
            'very_heavy_rain': 'sum',
            'extremely_heavy_rain': 'sum'
        }).reset_index()
        
        # Rename columns
        flood_summary.columns = [
            'district', 'year', 'heavy_rain_days', 
            'very_heavy_rain_days', 'extremely_heavy_rain_days'
        ]
        
        logger.info(f"Flood analysis completed for {len(flood_summary)} district-year combinations")
        return flood_summary
    
    def analyze_droughts(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Analyze drought events based on monsoon rainfall.
        Based on FLOODS-SQL.txt drought logic.
        """
        logger.info("Analyzing drought events based on monsoon rainfall")
        
        # Filter for monsoon months (JJAS) and study period
        df_monsoon = df[
            (df['date_r'].dt.month.isin([6, 7, 8, 9])) &
            (df['date_r'] <= '2025-08-14')
        ].copy()
        
        # Aggregate JJAS rainfall by district and year
        monsoon_summary = df_monsoon.groupby(['district', df_monsoon['date_r'].dt.year]).agg({
            'totals': 'sum'
        }).reset_index()
        monsoon_summary.columns = ['district', 'year', 'jjas_rainfall']
        
        # Calculate 30-year moving average LPA
        drought_results = []
        
        for district, sub in monsoon_summary.groupby('district'):
            sub = sub.sort_values('year')
            
            for _, row in sub.iterrows():
                target_year = row['year']
                jjas_rainfall = row['jjas_rainfall']
                
                # Calculate 30-year LPA
                lpa_mask = (
                    (sub['year'] >= target_year - 30) &
                    (sub['year'] <= target_year - 1)
                )
                lpa_30yr = sub.loc[lpa_mask, 'jjas_rainfall'].mean()
                
                if pd.isna(lpa_30yr) or lpa_30yr == 0:
                    drought_classification = 'Insufficient baseline'
                else:
                    departure_percent = ((jjas_rainfall - lpa_30yr) * 100.0 / lpa_30yr)
                    
                    if departure_percent <= self.drought_thresholds['severe_drought']:
                        drought_classification = 'Severe Drought'
                    elif departure_percent <= self.drought_thresholds['moderate_drought']:
                        drought_classification = 'Moderate Drought'
                    elif -19 <= departure_percent <= 19:
                        drought_classification = 'Normal'
                    elif departure_percent >= self.drought_thresholds['excess_rainfall']:
                        drought_classification = 'Excess Rainfall'
                    else:
                        drought_classification = 'Unclassified'
                
                drought_results.append({
                    'district': district,
                    'year': target_year,
                    'jjas_rainfall': jjas_rainfall,
                    'lpa_30yr': lpa_30yr,
                    'departure_percent': departure_percent,
                    'drought_classification': drought_classification
                })
        
        drought_summary = pd.DataFrame(drought_results)
        drought_summary = drought_summary[drought_summary['year'] >= 1997]
        
        logger.info(f"Drought analysis completed for {len(drought_summary)} district-year combinations")
        return drought_summary
    
    def update_terrain_classification(self, temp_df: pd.DataFrame, elevation_df: pd.DataFrame) -> pd.DataFrame:
        """Update terrain classification based on elevation data."""
        logger.info("Updating terrain classification based on elevation data")
        
        # Merge temperature data with elevation data
        merged_df = temp_df.merge(
            elevation_df[['district', 'avg_elevation']], 
            on='district', 
            how='left'
        )
        
        # Define coastal districts (this should be updated based on actual coastal districts)
        coastal_districts = [
            'Mumbai City', 'Palghar', 'Ratnagiri', 'Raigad', 
            'Sindhudurg', 'Mumbai Suburban'
        ]
        
        def classify_terrain_from_elevation(row):
            district = row['district']
            avg_elevation = row['avg_elevation']
            
            if pd.isna(avg_elevation):
                return 'plains'  # Default if elevation data missing
            
            is_coastal = district in coastal_districts
            return self.classify_terrain(district, avg_elevation, is_coastal)
        
        merged_df['terrain'] = merged_df.apply(classify_terrain_from_elevation, axis=1)
        
        logger.info("Terrain classification updated")
        return merged_df
    
    def export_results(self, results: Dict[str, pd.DataFrame], output_dir: Optional[str] = None, 
                       export_excel: bool = True):
        """Export analysis results to CSV and/or Excel files."""
        if output_dir is None:
            output_dir = self.data_dir / 'results'
        
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Export individual CSV files
        for analysis_type, df in results.items():
            if analysis_type in ['heatwave', 'flood', 'drought', 'rolling_temperature', 'unified']:
                filename = f"{analysis_type}_analysis_{timestamp}.csv"
                filepath = output_path / filename
                df.to_csv(filepath, index=False)
                logger.info(f"Exported {analysis_type} results to {filepath}")
        
        # Export comprehensive Excel file
        if export_excel:
            try:
                excel_filename = f"climate_analysis_complete_{timestamp}.xlsx"
                excel_filepath = output_path / excel_filename
                
                with pd.ExcelWriter(excel_filepath, engine='openpyxl') as writer:
                    # Unified data sheet (main)
                    if 'unified' in results and not results['unified'].empty:
                        results['unified'].to_excel(writer, sheet_name='Unified Data', index=False)
                    
                    # Heatwave sheet
                    if 'heatwave' in results and not results['heatwave'].empty:
                        results['heatwave'].to_excel(writer, sheet_name='Heatwave Analysis', index=False)
                    
                    # Flood sheet
                    if 'flood' in results and not results['flood'].empty:
                        results['flood'].to_excel(writer, sheet_name='Flood Analysis', index=False)
                    
                    # Drought sheet
                    if 'drought' in results and not results['drought'].empty:
                        results['drought'].to_excel(writer, sheet_name='Drought Analysis', index=False)
                    
                    # Rolling temperature sheet (limited to 5000 rows for Excel)
                    if 'rolling_temperature' in results and not results['rolling_temperature'].empty:
                        rolling_df = results['rolling_temperature'].head(5000)
                        rolling_df.to_excel(writer, sheet_name='Temperature Data', index=False)
                
                logger.info(f"Exported comprehensive Excel file to {excel_filepath}")
                
            except ImportError:
                logger.warning("openpyxl not installed. Install with: pip install openpyxl")
            except Exception as e:
                logger.error(f"Error creating Excel file: {str(e)}")
    
    def create_unified_dataset(self, results: Dict[str, pd.DataFrame], output_dir: Optional[str] = None) -> pd.DataFrame:
        """
        Create a single unified CSV file with all climate data by district.
        
        Args:
            results: Dictionary containing all analysis results
            output_dir: Directory to save the unified dataset
            
        Returns:
            Unified DataFrame with all climate data
        """
        logger.info("Creating unified district-wise climate dataset")
        
        try:
            # Start with heatwave data as base (has district, terrain, year)
            base_df = results['heatwave'].copy()
            
            # Merge flood data
            if 'flood' in results and not results['flood'].empty:
                flood_df = results['flood'].copy()
                base_df = base_df.merge(
                    flood_df, 
                    on=['district', 'year'], 
                    how='left',
                    suffixes=('', '_flood')
                )
                logger.info("Merged flood data")
            
            # Merge drought data
            if 'drought' in results and not results['drought'].empty:
                drought_df = results['drought'].copy()
                base_df = base_df.merge(
                    drought_df, 
                    on=['district', 'year'], 
                    how='left',
                    suffixes=('', '_drought')
                )
                logger.info("Merged drought data")
            
            # Add elevation data from rolling temperature data
            if 'rolling_temperature' in results and not results['rolling_temperature'].empty:
                # Get unique district-elevation-terrain mapping
                elevation_mapping = results['rolling_temperature'][['district', 'terrain']].drop_duplicates()
                base_df = base_df.merge(
                    elevation_mapping,
                    on='district',
                    how='left',
                    suffixes=('', '_temp')
                )
                logger.info("Added terrain classification")
            
            # Reorder columns for better readability
            column_order = [
                'district', 'terrain', 'year',
                'heatwave_days', 'severe_heatwave_days', 'frequency',
                'heavy_rain_days', 'very_heavy_rain_days', 'extremely_heavy_rain_days',
                'jjas_rainfall', 'lpa_30yr', 'departure_percent', 'drought_classification'
            ]
            
            # Only include columns that exist
            available_columns = [col for col in column_order if col in base_df.columns]
            base_df = base_df[available_columns]
            
            # Sort by district and year
            base_df = base_df.sort_values(['district', 'year']).reset_index(drop=True)
            
            # Save unified dataset
            if output_dir is None:
                output_dir = self.data_dir / 'results'
            
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"unified_climate_analysis_{timestamp}.csv"
            filepath = output_path / filename
            
            base_df.to_csv(filepath, index=False)
            logger.info(f"Unified dataset saved to: {filepath}")
            logger.info(f"Dataset contains {len(base_df)} records for {base_df['district'].nunique()} districts")
            
            return base_df
            
        except Exception as e:
            logger.error(f"Error creating unified dataset: {str(e)}")
            raise
    
    def run_complete_analysis_from_gee(self, 
                                     states: Optional[List[str]] = None,
                                     start_date: Optional[str] = None,
                                     end_date: Optional[str] = None,
                                     output_dir: Optional[str] = None,
                                     save_intermediate: bool = True) -> Dict[str, pd.DataFrame]:
        """
        Run the complete climate analysis pipeline using Google Earth Engine.
        
        Args:
            states: List of states to process (default: from config)
            start_date: Start date in YYYY-MM-DD format (default: from config)
            end_date: End date in YYYY-MM-DD format (default: from config)
            output_dir: Directory to save results
            save_intermediate: Whether to save intermediate data files
            
        Returns:
            Dictionary containing all analysis results
        """
        if not self.gee_initialized:
            raise RuntimeError("Google Earth Engine not initialized. Please authenticate first.")
        
        logger.info("Starting complete climate analysis pipeline with Google Earth Engine")
        
        try:
            # Extract data from Google Earth Engine
            logger.info("Step 1: Extracting temperature data from Google Earth Engine")
            temp_df = self.extract_temperature_data(states, start_date, end_date)
            
            logger.info("Step 2: Extracting rainfall data from Google Earth Engine")
            rainfall_df = self.extract_rainfall_data(states, start_date, end_date)
            
            logger.info("Step 3: Extracting elevation data from Google Earth Engine")
            elevation_df = self.extract_elevation_data(states)
            
            # Save intermediate data if requested
            if save_intermediate:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                temp_df.to_csv(self.data_dir / f'temperature_data_{timestamp}.csv', index=False)
                rainfall_df.to_csv(self.data_dir / f'rainfall_data_{timestamp}.csv', index=False)
                elevation_df.to_csv(self.data_dir / f'elevation_data_{timestamp}.csv', index=False)
                logger.info("Intermediate data files saved")
            
            # Continue with analysis
            return self._run_analysis_pipeline(temp_df, rainfall_df, elevation_df, output_dir)
            
        except Exception as e:
            logger.error(f"Error in complete GEE analysis pipeline: {str(e)}")
            raise
    
    def _run_analysis_pipeline(self, temp_df: pd.DataFrame, rainfall_df: pd.DataFrame, 
                              elevation_df: pd.DataFrame, output_dir: Optional[str] = None) -> Dict[str, pd.DataFrame]:
        """Helper method to run the analysis pipeline with given data."""
        logger.info("Running climate analysis pipeline")
        
        try:
            # Update terrain classification
            temp_df = self.update_terrain_classification(temp_df, elevation_df)
            
            # Calculate rolling 30-year averages
            rolling_df = self.calculate_rolling_30year_averages(temp_df)
            
            # Run analyses
            heatwave_results = self.analyze_heatwaves(rolling_df)
            flood_results = self.analyze_floods(rainfall_df)
            drought_results = self.analyze_droughts(rainfall_df)
            
            # Compile results
            results = {
                'heatwave': heatwave_results,
                'flood': flood_results,
                'drought': drought_results,
                'rolling_temperature': rolling_df
            }
            
            # Export individual results
            self.export_results(results, output_dir)
            
            # Create unified dataset
            unified_df = self.create_unified_dataset(results, output_dir)
            results['unified'] = unified_df
            
            logger.info("Climate analysis pipeline completed successfully")
            return results
            
        except Exception as e:
            logger.error(f"Error in analysis pipeline: {str(e)}")
            raise
    
    def run_complete_analysis(self, 
                            temp_file: str,
                            rainfall_file: str, 
                            elevation_file: str,
                            output_dir: Optional[str] = None) -> Dict[str, pd.DataFrame]:
        """
        Run the complete climate analysis pipeline.
        
        Args:
            temp_file: Path to temperature data CSV
            rainfall_file: Path to rainfall data CSV  
            elevation_file: Path to elevation data CSV
            output_dir: Directory to save results
            
        Returns:
            Dictionary containing all analysis results
        """
        logger.info("Starting complete climate analysis pipeline")
        
        try:
            # Load data
            temp_df = self.load_temperature_data(temp_file)
            rainfall_df = self.load_rainfall_data(rainfall_file)
            elevation_df = self.load_elevation_data(elevation_file)
            
            # Update terrain classification
            temp_df = self.update_terrain_classification(temp_df, elevation_df)
            
            # Calculate rolling 30-year averages
            rolling_df = self.calculate_rolling_30year_averages(temp_df)
            
            # Run analyses
            heatwave_results = self.analyze_heatwaves(rolling_df)
            flood_results = self.analyze_floods(rainfall_df)
            drought_results = self.analyze_droughts(rainfall_df)
            
            # Compile results
            results = {
                'heatwave': heatwave_results,
                'flood': flood_results,
                'drought': drought_results,
                'rolling_temperature': rolling_df
            }
            
            # Export individual results
            self.export_results(results, output_dir)
            
            # Create unified dataset
            unified_df = self.create_unified_dataset(results, output_dir)
            results['unified'] = unified_df
            
            logger.info("Climate analysis pipeline completed successfully")
            return results
            
        except Exception as e:
            logger.error(f"Error in complete analysis pipeline: {str(e)}")
            raise


def main():
    """Main function to demonstrate usage."""
    
    print("\n" + "="*60)
    print("CLIMATE DATA ANALYSIS SYSTEM WITH GOOGLE EARTH ENGINE")
    print("="*60)
    
    # Initialize analyzer
    analyzer = ClimateDataAnalyzer()
    
    if analyzer.gee_initialized:
        print("\n✅ Google Earth Engine is initialized and ready!")
        print("\nYou can now run the complete analysis directly from Python:")
        print("\n# Example 1: Run complete analysis for all configured states")
        print("analyzer = ClimateDataAnalyzer()")
        print("results = analyzer.run_complete_analysis_from_gee()")
        print("\n# Example 2: Run analysis for specific states and date range")
        print("results = analyzer.run_complete_analysis_from_gee(")
        print("    states=['Maharashtra', 'Gujarat'],")
        print("    start_date='2020-01-01',")
        print("    end_date='2023-12-31'")
        print(")")
        print("\n# Example 3: Extract individual datasets")
        print("temp_data = analyzer.extract_temperature_data()")
        print("rainfall_data = analyzer.extract_rainfall_data()")
        print("elevation_data = analyzer.extract_elevation_data()")
        
    else:
        print("\n❌ Google Earth Engine not initialized.")
        print("\nTo use the automated Google Earth Engine integration:")
        print("1. Install the Earth Engine API: pip install earthengine-api")
        print("2. Authenticate: earthengine authenticate")
        print("3. Re-run this script")
        
        print("\nAlternatively, you can use the manual approach:")
        print("1. Generate Google Earth Engine code files")
        print("2. Run the code in Google Earth Engine Code Editor")
        print("3. Download the CSV files")
        print("4. Use run_complete_analysis() with file paths")
        
        # Generate Google Earth Engine code files for manual use
        gee_codes = analyzer.generate_google_earth_code()
        code_dir = Path('./google_earth_code')
        code_dir.mkdir(exist_ok=True)
        
        for code_type, code_content in gee_codes.items():
            code_file = code_dir / f"{code_type}_extraction.js"
            with open(code_file, 'w') as f:
                f.write(code_content)
            print(f"Generated Google Earth Engine code: {code_file}")
    
    print("\n" + "="*60)
    print("FEATURES:")
    print("="*60)
    print("• Direct Google Earth Engine API integration")
    print("• Automated data extraction (temperature, rainfall, elevation)")
    print("• Terrain classification (coastal, hilly, plains)")
    print("• Rolling 30-year temperature averages")
    print("• IMD-compliant heatwave analysis")
    print("• Flood and drought assessment")
    print("• Comprehensive logging and error handling")
    print("• Flexible configuration system")
    print("• Results export to CSV format")
    
    print("\n" + "="*60)
    print("QUICK START:")
    print("="*60)
    print("1. Install: pip install earthengine-api pandas numpy")
    print("2. Authenticate: earthengine authenticate")
    print("3. Run: python main.py")
    print("4. Use the analyzer methods as shown above")


if __name__ == "__main__":
    main()
