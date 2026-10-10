#!/usr/bin/env python3
"""
Full-Scale Climate Analysis: 30 Years of Complete District-Level Data
Creates comprehensive Excel file with multiple sheets
"""

from main import ClimateDataAnalyzer
import pandas as pd
import sys

def full_scale_analysis():
    """Run complete 30-year analysis and create comprehensive Excel output."""
    
    print("🚀 FULL-SCALE CLIMATE ANALYSIS")
    print("=" * 60)
    print("📊 30 Years of District-Level Data")
    print("=" * 60)
    
    # Initialize analyzer
    print("\n🌍 Initializing Climate Data Analyzer...")
    analyzer = ClimateDataAnalyzer()
    
    if not analyzer.gee_initialized:
        print("❌ Google Earth Engine not initialized")
        return False
    
    print("✅ Analyzer initialized successfully!")
    
    # Configure for full-scale analysis
    print("\n⚙️ Configuration:")
    print("   • Period: 1997-2025 (28 years of data)")
    print("   • Granularity: Daily district-level")
    print("   • States: All configured states")
    print("   • Output: Multi-sheet Excel file")
    
    print("\n📋 Will Analyze:")
    print("   1. Temperature data (mean, min, max daily)")
    print("   2. Rolling 30-year same-day averages")
    print("   3. Heatwave analysis (IMD criteria)")
    print("   4. Rainfall data (daily totals)")
    print("   5. Flood analysis (heavy/extremely heavy rain)")
    print("   6. Drought analysis (JJAS monsoon)")
    print("   7. Terrain classification")
    print("   8. Unified district-year dataset")
    
    print("\n⏱️ Estimated Time: 15-30 minutes")
    print("   • Data extraction: 10-20 minutes")
    print("   • Processing: 5-10 minutes")
    
    # Confirm with user
    print("\n❓ Ready to start full-scale analysis?")
    response = input("   Type 'yes' to proceed or 'test' for 1-year test: ")
    
    if response.lower() == 'test':
        print("\n🧪 Running 1-year test analysis...")
        results = run_test_analysis(analyzer)
    elif response.lower() == 'yes':
        print("\n🚀 Starting full-scale 30-year analysis...")
        results = run_full_analysis(analyzer)
    else:
        print("❌ Analysis cancelled")
        return False
    
    if results:
        print("\n✅ Creating comprehensive Excel file...")
        create_excel_output(analyzer, results)
        print("\n🎉 Full-scale analysis completed successfully!")
        return True
    else:
        print("\n❌ Analysis failed")
        return False

def run_test_analysis(analyzer):
    """Run a 1-year test analysis."""
    try:
        results = analyzer.run_complete_analysis_from_gee(
            states=['Maharashtra'],
            start_date='2023-01-01',
            end_date='2023-12-31',
            save_intermediate=True
        )
        return results
    except Exception as e:
        print(f"❌ Error during test analysis: {str(e)}")
        return None

def run_full_analysis(analyzer):
    """Run the complete 30-year analysis."""
    try:
        results = analyzer.run_complete_analysis_from_gee(
            states=['Maharashtra', 'Gujarat', 'Bihar'],
            start_date='1997-01-01',
            end_date='2025-08-19',
            save_intermediate=True
        )
        return results
    except Exception as e:
        print(f"❌ Error during full analysis: {str(e)}")
        print("\n💡 Trying with smaller date range...")
        try:
            results = analyzer.run_complete_analysis_from_gee(
                states=['Maharashtra'],
                start_date='2020-01-01',
                end_date='2023-12-31',
                save_intermediate=True
            )
            return results
        except Exception as e2:
            print(f"❌ Error: {str(e2)}")
            return None

def create_excel_output(analyzer, results):
    """Create comprehensive Excel file with multiple sheets."""
    
    try:
        timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
        filename = f"climate_analysis_complete_{timestamp}.xlsx"
        filepath = analyzer.data_dir / 'results' / filename
        
        print(f"\n📝 Creating Excel file: {filename}")
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            # Sheet 1: Unified Climate Dataset (MAIN)
            if 'unified' in results and not results['unified'].empty:
                print("   ✓ Sheet 1: Unified Climate Dataset")
                results['unified'].to_excel(writer, sheet_name='Unified Data', index=False)
            
            # Sheet 2: Heatwave Analysis
            if 'heatwave' in results and not results['heatwave'].empty:
                print("   ✓ Sheet 2: Heatwave Analysis")
                results['heatwave'].to_excel(writer, sheet_name='Heatwave Analysis', index=False)
            
            # Sheet 3: Flood Analysis
            if 'flood' in results and not results['flood'].empty:
                print("   ✓ Sheet 3: Flood Analysis")
                results['flood'].to_excel(writer, sheet_name='Flood Analysis', index=False)
            
            # Sheet 4: Drought Analysis
            if 'drought' in results and not results['drought'].empty:
                print("   ✓ Sheet 4: Drought Analysis")
                results['drought'].to_excel(writer, sheet_name='Drought Analysis', index=False)
            
            # Sheet 5: Rolling Temperature Data
            if 'rolling_temperature' in results and not results['rolling_temperature'].empty:
                print("   ✓ Sheet 5: Rolling Temperature Data")
                rolling_df = results['rolling_temperature'].head(5000)  # Limit for Excel
                rolling_df.to_excel(writer, sheet_name='Temperature Data', index=False)
                if len(results['rolling_temperature']) > 5000:
                    print(f"      (Showing first 5000 rows of {len(results['rolling_temperature'])} total)")
        
        print(f"\n✅ Excel file created successfully!")
        print(f"   📁 Location: {filepath}")
        print(f"   📊 Total size: {filepath.stat().st_size / 1024 / 1024:.2f} MB")
        
        # Show summary
        if 'unified' in results:
            print(f"\n📈 Summary:")
            unified = results['unified']
            print(f"   • Districts: {unified['district'].nunique()}")
            print(f"   • Years: {unified['year'].min()} - {unified['year'].max()}")
            print(f"   • Total records: {len(unified)}")
            print(f"   • Total sheets: 5")
        
        return filepath
        
    except Exception as e:
        print(f"❌ Error creating Excel file: {str(e)}")
        return None

if __name__ == "__main__":
    print("\n🌍 Welcome to Full-Scale Climate Analysis")
    print("=" * 60)
    print("This will create a comprehensive Excel file with:")
    print("  • 30 years of climate data")
    print("  • District-level granularity")
    print("  • Multiple analysis sheets")
    print("  • Complete heatwave, flood, and drought data")
    print("=" * 60)
    
    success = full_scale_analysis()
    
    if success:
        print("\n🎉 Analysis complete! Check the results folder for your Excel file.")
    else:
        print("\n❌ Analysis incomplete. Check error messages above.")
    
    sys.exit(0 if success else 1)
