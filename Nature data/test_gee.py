#!/usr/bin/env python3
"""
Quick Google Earth Engine Test
"""

import ee

def test_gee():
    """Test Google Earth Engine without requiring a project."""
    try:
        # Try to initialize without project (works for basic usage)
        ee.Initialize()
        print("✅ Google Earth Engine initialized successfully!")
        
        # Test with a simple operation
        test_image = ee.Image('USGS/SRTMGL1_003')
        test_value = test_image.select('elevation').getInfo()
        print("✅ Connection test successful!")
        print(f"   Test elevation value: {test_value}")
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        
        if "no project found" in str(e):
            print("\n🔧 Project setup needed:")
            print("1. Go to: https://console.cloud.google.com/")
            print("2. Create a new project")
            print("3. Enable Earth Engine API")
            print("4. Try again")
        elif "Please authorize" in str(e):
            print("\n🔐 Authentication needed:")
            print("Run: python3 simple_auth.py")
        else:
            print("\n❓ Unknown error - check your Earth Engine account status")
        
        return False

if __name__ == "__main__":
    print("🧪 Testing Google Earth Engine...")
    test_gee()
