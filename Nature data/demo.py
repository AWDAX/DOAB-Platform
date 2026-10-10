#!/usr/bin/env python3
"""
Climate Analysis Demo - Works without Google Cloud Project
This version uses the manual data extraction approach.
"""

from main import ClimateDataAnalyzer
import os

def run_demo():
    """Run a demo of the climate analysis system."""
    
    print("🌍 Climate Data Analysis System Demo")
    print("=" * 50)
    
    # Initialize analyzer without GEE (for demo purposes)
    print("📊 Initializing Climate Data Analyzer...")
    analyzer = ClimateDataAnalyzer(initialize_gee=False)
    
    print("✅ Analyzer initialized successfully!")
    
    # Generate Google Earth Engine code files
    print("\n🔧 Generating Google Earth Engine code files...")
    gee_codes = analyzer.generate_google_earth_code()
    
    # Save code files
    code_dir = os.path.join(os.getcwd(), 'google_earth_code')
    os.makedirs(code_dir, exist_ok=True)
    
    for code_type, code_content in gee_codes.items():
        code_file = os.path.join(code_dir, f"{code_type}_extraction.js")
        with open(code_file, 'w') as f:
            f.write(code_content)
        print(f"   ✅ Generated: {code_file}")
    
    print(f"\n📁 Code files saved in: {code_dir}")
    
    # Show what the system can do
    print("\n🎯 What this system can analyze:")
    print("   • Daily temperature data (mean, min, max)")
    print("   • Daily rainfall data")
    print("   • District elevation data")
    print("   • Terrain classification (coastal, hilly, plains)")
    print("   • Rolling 30-year temperature averages")
    print("   • IMD-compliant heatwave analysis")
    print("   • Flood and drought assessment")
    
    print("\n📋 Next steps:")
    print("1. Set up Google Cloud Project (see instructions above)")
    print("2. Or use the generated JavaScript files manually:")
    print("   - Go to: https://code.earthengine.google.com/")
    print("   - Copy/paste the generated .js files")
    print("   - Run them and download CSV files")
    print("   - Use: analyzer.run_complete_analysis(temp_file='...', rainfall_file='...', elevation_file='...')")
    
    print("\n🔧 For automated analysis (once project is set up):")
    print("   analyzer = ClimateDataAnalyzer()")
    print("   results = analyzer.run_complete_analysis_from_gee()")
    
    return True

if __name__ == "__main__":
    run_demo()
