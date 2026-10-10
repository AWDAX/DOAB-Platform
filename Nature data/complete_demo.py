#!/usr/bin/env python3
"""
Complete Climate Analysis Demo
"""

from main import ClimateDataAnalyzer
import pandas as pd

def run_complete_demo():
    """Run a complete demo of the climate analysis system."""
    
    print("🌍 Complete Climate Analysis Demo")
    print("=" * 50)
    
    # Initialize analyzer
    print("📊 Initializing Climate Data Analyzer...")
    analyzer = ClimateDataAnalyzer()
    
    if not analyzer.gee_initialized:
        print("❌ Google Earth Engine not initialized")
        return False
    
    print("✅ Analyzer initialized successfully!")
    
    # Show what we can do
    print("\n🎯 Available Analysis Options:")
    print("1. Extract individual datasets:")
    print("   - Temperature data (daily mean, min, max)")
    print("   - Rainfall data (daily totals)")
    print("   - Elevation data (district averages)")
    
    print("\n2. Run complete analysis:")
    print("   - Terrain classification")
    print("   - Rolling 30-year temperature averages")
    print("   - Heatwave analysis (IMD criteria)")
    print("   - Flood and drought assessment")
    
    print("\n3. Customize analysis:")
    print("   - Select specific states")
    print("   - Choose date ranges")
    print("   - Configure analysis parameters")
    
    # Example usage
    print("\n🚀 Example Usage:")
    print("\n# Run complete analysis for all configured states:")
    print("results = analyzer.run_complete_analysis_from_gee()")
    
    print("\n# Run analysis for specific states:")
    print("results = analyzer.run_complete_analysis_from_gee(")
    print("    states=['Maharashtra', 'Gujarat'],")
    print("    start_date='2020-01-01',")
    print("    end_date='2023-12-31'")
    print(")")
    
    print("\n# Extract individual datasets:")
    print("temp_data = analyzer.extract_temperature_data(states=['Maharashtra'])")
    print("rainfall_data = analyzer.extract_rainfall_data(states=['Maharashtra'])")
    print("elevation_data = analyzer.extract_elevation_data(states=['Maharashtra'])")
    
    print("\n📋 Current Configuration:")
    print(f"   States: {analyzer.config['states_to_process']}")
    print(f"   Analysis Period: {analyzer.config['analysis_period']['start']} to {analyzer.config['analysis_period']['end']}")
    print(f"   Study Period: {analyzer.config['study_period']['start']} to {analyzer.config['study_period']['end']}")
    
    print("\n✅ Your system is ready to use!")
    print("\n💡 Next steps:")
    print("1. Run a small test analysis for one state")
    print("2. Scale up to multiple states")
    print("3. Customize parameters as needed")
    
    return True

if __name__ == "__main__":
    run_complete_demo()
