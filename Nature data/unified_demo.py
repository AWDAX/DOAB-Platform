#!/usr/bin/env python3
"""
Unified Climate Dataset Demo
Creates a single CSV file with all climate data organized by district.
"""

from main import ClimateDataAnalyzer
import pandas as pd

def create_unified_dataset_demo():
    """Demo of creating a unified climate dataset."""
    
    print("📊 Unified Climate Dataset Creation Demo")
    print("=" * 50)
    
    # Initialize analyzer
    print("🌍 Initializing Climate Data Analyzer...")
    analyzer = ClimateDataAnalyzer()
    
    if not analyzer.gee_initialized:
        print("❌ Google Earth Engine not initialized")
        return False
    
    print("✅ Analyzer initialized successfully!")
    
    print("\n🎯 What the unified dataset will contain:")
    print("   • District name and terrain classification")
    print("   • Year-wise data")
    print("   • Heatwave days (normal + severe)")
    print("   • Flood days (heavy, very heavy, extremely heavy rain)")
    print("   • Drought classification and rainfall data")
    print("   • All data organized by district and year")
    
    print("\n📋 Dataset Structure:")
    print("   Columns: district, terrain, year, heatwave_days, severe_heatwave_days,")
    print("            frequency, heavy_rain_days, very_heavy_rain_days,")
    print("            extremely_heavy_rain_days, jjas_rainfall, lpa_30yr,")
    print("            departure_percent, drought_classification")
    
    print("\n🚀 To create your unified dataset, run:")
    print("\n# For all configured states:")
    print("results = analyzer.run_complete_analysis_from_gee()")
    print("unified_data = results['unified']")
    
    print("\n# For specific states (faster):")
    print("results = analyzer.run_complete_analysis_from_gee(")
    print("    states=['Maharashtra'],")
    print("    start_date='2020-01-01',")
    print("    end_date='2023-12-31'")
    print(")")
    print("unified_data = results['unified']")
    
    print("\n📁 Output Files:")
    print("   • Individual analysis files (heatwave, flood, drought)")
    print("   • unified_climate_analysis_YYYYMMDD_HHMMSS.csv (MAIN FILE)")
    
    print("\n💡 The unified CSV file will be saved in the 'results' folder")
    print("   and will contain all climate data organized by district and year.")
    
    return True

if __name__ == "__main__":
    create_unified_dataset_demo()
