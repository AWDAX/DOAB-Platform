#!/usr/bin/env python3
"""
Google Earth Engine Authentication Script
Alternative method for authenticating with GEE when command-line tool has issues.
"""

import ee
import webbrowser
import json
import os
from pathlib import Path

def authenticate_gee():
    """Authenticate with Google Earth Engine using interactive method."""
    
    print("🌍 Google Earth Engine Authentication")
    print("=" * 50)
    
    try:
        # Try to initialize (will prompt for authentication if needed)
        ee.Initialize()
        print("✅ Google Earth Engine is already authenticated!")
        return True
        
    except Exception as e:
        print(f"❌ Authentication needed: {str(e)}")
        print("\n🔐 Please follow these steps:")
        print("1. Go to: https://code.earthengine.google.com/")
        print("2. Sign in with your Google account")
        print("3. Accept the terms of service")
        print("4. Go to: https://code.earthengine.google.com/register")
        print("5. Register for Earth Engine access")
        print("6. Wait for approval (usually 1-2 days)")
        print("7. Once approved, run this script again")
        
        # Try to open the registration page
        try:
            webbrowser.open("https://code.earthengine.google.com/register")
            print("\n🌐 Opening registration page in your browser...")
        except:
            print("\n📋 Please manually visit: https://code.earthengine.google.com/register")
        
        return False

def test_gee_connection():
    """Test if GEE is working properly."""
    try:
        # Test with a simple operation
        test_image = ee.Image('USGS/SRTMGL1_003')
        test_value = test_image.select('elevation').getInfo()
        print("✅ Google Earth Engine connection test successful!")
        print(f"   Test elevation value: {test_value}")
        return True
    except Exception as e:
        print(f"❌ GEE connection test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("Starting Google Earth Engine authentication...")
    
    if authenticate_gee():
        print("\n🧪 Testing GEE connection...")
        if test_gee_connection():
            print("\n🎉 Google Earth Engine is ready to use!")
            print("\nYou can now run your climate analysis:")
            print("python3 main.py")
        else:
            print("\n⚠️  Authentication successful but connection test failed.")
            print("   This might be due to network issues or API limits.")
    else:
        print("\n📝 Please complete the registration process and try again.")
