#!/usr/bin/env python3
"""
Simple Google Earth Engine Authentication
"""

import ee

def simple_auth():
    """Simple authentication method."""
    try:
        # This will prompt for authentication in the browser
        ee.Authenticate()
        
        # Initialize with a default project
        ee.Initialize(project='ee-your-project-id')
        print("✅ Google Earth Engine authenticated successfully!")
        return True
    except Exception as e:
        if "no project found" in str(e):
            print("✅ Authentication successful!")
            print("⚠️  You need to set up a Google Cloud Project.")
            print("\n🔧 To fix this:")
            print("1. Go to: https://console.cloud.google.com/")
            print("2. Create a new project or select an existing one")
            print("3. Enable the Earth Engine API")
            print("4. Run this script again with your project ID")
            print("\nOr use the manual method:")
            print("ee.Initialize(project='your-project-id')")
            return False
        else:
            print(f"❌ Authentication failed: {str(e)}")
            print("\nPlease make sure you have:")
            print("1. A Google Earth Engine account (register at https://code.earthengine.google.com/register)")
            print("2. Approved access to Earth Engine")
            return False

if __name__ == "__main__":
    simple_auth()
