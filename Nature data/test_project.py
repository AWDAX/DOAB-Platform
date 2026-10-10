#!/usr/bin/env python3
"""
Test Google Earth Engine with Project ID
"""

import ee

def test_with_project(project_id):
    """Test Google Earth Engine with the provided project ID."""
    try:
        print(f"🧪 Testing Google Earth Engine with project: {project_id}")
        
        # Initialize with your project ID
        ee.Initialize(project=project_id)
        print("✅ Google Earth Engine initialized successfully!")
        
        # Test with a simple operation
        test_image = ee.Image('USGS/SRTMGL1_003')
        test_value = test_image.select('elevation').getInfo()
        print("✅ Connection test successful!")
        print(f"   Test elevation value: {test_value}")
        
        # Test with a more complex operation
        print("\n🌡️ Testing temperature data access...")
        era_collection = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
        first_image = era_collection.first()
        print("✅ ERA5-Land temperature data accessible!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    import os
    project_id = os.environ.get("GEE_PROJECT_ID", "")
    if not project_id:
        print("Set GEE_PROJECT_ID before running this check.")
        raise SystemExit(1)
    test_with_project(project_id)
