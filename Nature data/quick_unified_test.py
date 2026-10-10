#!/usr/bin/env python3
"""
Quick Test: Create Unified Climate Dataset
This will create a single CSV file with all climate data by district.
"""

from main import ClimateDataAnalyzer
import pandas as pd

def quick_unified_test():
    """Run a quick test to create unified dataset for one state."""
    
    print("🧪 Quick Test: Unified Climate Dataset")
    print("=" * 50)
    
    # Initialize analyzer
    print("📊 Initializing Climate Data Analyzer...")
    analyzer = ClimateDataAnalyzer()
    
    if not analyzer.gee_initialized:
        print("❌ Google Earth Engine not initialized")
        return False
    
    print("✅ Analyzer initialized successfully!")
    
    print("\n🚀 Running analysis for Maharashtra (2020-2023)...")
    print("   This will create a unified CSV file with all climate data.")
    
    try:
        # Run analysis for Maharashtra only (smaller dataset for testing)
        results = analyzer.run_complete_analysis_from_gee(
            states=['Maharashtra'],
            start_date='2020-01-01',
            end_date='2023-12-31',
            save_intermediate=True
        )
        
        # Get the unified dataset
        unified_data = results['unified']
        
        print(f"\n✅ Analysis completed successfully!")
        print(f"   📊 Unified dataset contains {len(unified_data)} records")
        print(f"   🏘️  Covers {unified_data['district'].nunique()} districts")
        print(f"   📅 Years: {unified_data['year'].min()} to {unified_data['year'].max()}")
        
        print(f"\n📋 Dataset columns:")
        for col in unified_data.columns:
            print(f"   • {col}")
        
        print(f"\n📁 Files created:")
        print(f"   • unified_climate_analysis_YYYYMMDD_HHMMSS.csv (MAIN FILE)")
        print(f"   • Individual analysis files (heatwave, flood, drought)")
        print(f"   • Intermediate data files (temperature, rainfall, elevation)")
        
        print(f"\n🔍 Sample data preview:")
        print(unified_data.head())
        
        print(f"\n📊 Summary by district:")
        district_summary = unified_data.groupby('district').agg({
            'heatwave_days': 'sum',
            'severe_heatwave_days': 'sum',
            'heavy_rain_days': 'sum',
            'drought_classification': lambda x: x.value_counts().to_dict()
        }).round(2)
        print(district_summary.head())
        
        return True
        
    except Exception as e:
        print(f"❌ Error during analysis: {str(e)}")
        print("\n💡 This might be due to:")
        print("   • Large data volume (try smaller date range)")
        print("   • Network issues")
        print("   • Google Earth Engine API limits")
        return False

if __name__ == "__main__":
    quick_unified_test()
