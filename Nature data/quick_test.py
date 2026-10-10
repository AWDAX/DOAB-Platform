#!/usr/bin/env python3
"""
Quick Test of Climate Analysis System
"""

from main import ClimateDataAnalyzer

def quick_test():
    """Run a quick test of the climate analysis system."""
    
    print("🧪 Quick Test of Climate Analysis System")
    print("=" * 50)
    
    # Initialize analyzer
    print("📊 Initializing Climate Data Analyzer...")
    analyzer = ClimateDataAnalyzer()
    
    if not analyzer.gee_initialized:
        print("❌ Google Earth Engine not initialized")
        return False
    
    print("✅ Analyzer initialized successfully!")
    
    # Test elevation data extraction (fastest to test)
    print("\n🏔️ Testing elevation data extraction...")
    try:
        elevation_data = analyzer.extract_elevation_data(states=['Maharashtra'])
        print(f"✅ Successfully extracted elevation data for {len(elevation_data)} districts")
        print(f"   Sample data: {elevation_data.head()}")
        return True
    except Exception as e:
        print(f"❌ Error extracting elevation data: {str(e)}")
        return False

if __name__ == "__main__":
    quick_test()
