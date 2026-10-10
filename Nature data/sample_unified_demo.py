#!/usr/bin/env python3
"""
Efficient Climate Analysis Demo
Creates unified dataset using a more efficient approach.
"""

from main import ClimateDataAnalyzer
import pandas as pd
import numpy as np

def create_sample_unified_dataset():
    """Create a sample unified dataset to show the structure."""
    
    print("📊 Creating Sample Unified Climate Dataset")
    print("=" * 50)
    
    # Initialize analyzer
    print("🌍 Initializing Climate Data Analyzer...")
    analyzer = ClimateDataAnalyzer()
    
    if not analyzer.gee_initialized:
        print("❌ Google Earth Engine not initialized")
        return False
    
    print("✅ Analyzer initialized successfully!")
    
    # Create sample data to show the structure
    print("\n🔧 Creating sample unified dataset structure...")
    
    # Sample districts from Maharashtra
    districts = ['Mumbai City', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad']
    years = [2020, 2021, 2022, 2023]
    terrains = ['coastal', 'hilly', 'plains', 'hilly', 'plains']
    
    # Create sample data
    sample_data = []
    for i, district in enumerate(districts):
        for year in years:
            sample_data.append({
                'district': district,
                'terrain': terrains[i],
                'year': year,
                'heatwave_days': np.random.randint(0, 15),
                'severe_heatwave_days': np.random.randint(0, 5),
                'frequency': np.random.randint(0, 20),
                'heavy_rain_days': np.random.randint(5, 25),
                'very_heavy_rain_days': np.random.randint(1, 10),
                'extremely_heavy_rain_days': np.random.randint(0, 3),
                'jjas_rainfall': np.random.uniform(800, 1200),
                'lpa_30yr': np.random.uniform(900, 1100),
                'departure_percent': np.random.uniform(-20, 30),
                'drought_classification': np.random.choice(['Normal', 'Moderate Drought', 'Severe Drought', 'Excess Rainfall'])
            })
    
    # Create DataFrame
    unified_df = pd.DataFrame(sample_data)
    
    # Save sample dataset
    output_path = analyzer.data_dir / 'results'
    output_path.mkdir(exist_ok=True)
    
    timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
    filename = f"sample_unified_climate_analysis_{timestamp}.csv"
    filepath = output_path / filename
    
    unified_df.to_csv(filepath, index=False)
    
    print(f"\n✅ Sample unified dataset created!")
    print(f"   📊 Contains {len(unified_df)} records")
    print(f"   🏘️  Covers {unified_df['district'].nunique()} districts")
    print(f"   📅 Years: {unified_df['year'].min()} to {unified_df['year'].max()}")
    print(f"   📁 Saved to: {filepath}")
    
    print(f"\n📋 Dataset Structure:")
    print(unified_df.head())
    
    print(f"\n📊 Summary by District:")
    district_summary = unified_df.groupby('district').agg({
        'heatwave_days': 'sum',
        'severe_heatwave_days': 'sum',
        'heavy_rain_days': 'sum',
        'jjas_rainfall': 'mean'
    }).round(2)
    print(district_summary)
    
    print(f"\n🎯 This shows the exact structure of your unified CSV file!")
    print(f"   • Each row represents one district-year combination")
    print(f"   • All climate data (heatwave, flood, drought) in one file")
    print(f"   • Organized by district and year")
    
    print(f"\n🚀 To create the real dataset with actual data:")
    print(f"   # For a smaller test (1 year, 1 state):")
    print(f"   results = analyzer.run_complete_analysis_from_gee(")
    print(f"       states=['Maharashtra'],")
    print(f"       start_date='2023-01-01',")
    print(f"       end_date='2023-12-31'")
    print(f"   )")
    print(f"   unified_data = results['unified']")
    
    return True

if __name__ == "__main__":
    create_sample_unified_dataset()
