# Google Earth Engine API Setup Guide

## 🚀 Quick Setup Steps

### **Step 1: Register for Google Earth Engine**

1. **Go to the registration page:**
   - Visit: https://code.earthengine.google.com/register
   - Sign in with your Google account
   - Fill out the registration form

2. **Wait for approval:**
   - **Personal accounts**: 1-2 days
   - **Institutional accounts**: Usually within hours
   - You'll receive an email when approved

### **Step 2: Install Dependencies**

```bash
# Install required packages
pip3 install earthengine-api pandas numpy

# Or install from requirements.txt
pip3 install -r requirements.txt
```

### **Step 3: Authenticate**

Choose one of these methods:

#### **Method A: Simple Authentication (Recommended)**
```bash
python3 simple_auth.py
```

#### **Method B: Detailed Authentication**
```bash
python3 authenticate_gee.py
```

#### **Method C: Manual Authentication**
```python
import ee
ee.Authenticate()  # This opens browser for authentication
ee.Initialize()    # Initialize after authentication
```

### **Step 4: Test Your Setup**

```bash
python3 main.py
```

If successful, you should see:
```
✅ Google Earth Engine is initialized and ready!
```

## 🔧 Troubleshooting

### **Common Issues:**

1. **"earthengine: command not found"**
   - Use the Python authentication methods above
   - Or add the earthengine command to your PATH

2. **"Please authorize access to your Earth Engine account"**
   - You need to register for Earth Engine access first
   - Visit: https://code.earthengine.google.com/register

3. **"Account not approved"**
   - Wait for approval (1-2 days for personal accounts)
   - Check your email for approval notification

4. **Python version compatibility issues**
   - The system works with Python 3.7+
   - For best compatibility, use Python 3.10+

### **Alternative: Manual Data Extraction**

If you can't get the API working, you can still use the system:

1. **Generate JavaScript code:**
   ```python
   from main import ClimateDataAnalyzer
   analyzer = ClimateDataAnalyzer(initialize_gee=False)
   gee_codes = analyzer.generate_google_earth_code()
   ```

2. **Run in Google Earth Engine Code Editor:**
   - Go to: https://code.earthengine.google.com/
   - Copy and paste the generated JavaScript code
   - Run the code and download CSV files

3. **Use with downloaded data:**
   ```python
   results = analyzer.run_complete_analysis(
       temp_file='data/temperature_data.csv',
       rainfall_file='data/rainfall_data.csv',
       elevation_file='data/elevation_data.csv'
   )
   ```

## 📋 Account Types

### **Personal Account**
- **Cost**: Free
- **Approval time**: 1-2 days
- **Limits**: Standard usage quotas
- **Best for**: Individual research, learning

### **Institutional Account**
- **Cost**: Free
- **Approval time**: Usually within hours
- **Limits**: Higher usage quotas
- **Best for**: University, research institutions

### **Commercial Account**
- **Cost**: Pay-per-use
- **Approval time**: Varies
- **Limits**: Higher quotas, commercial use allowed
- **Best for**: Commercial applications

## 🌐 Registration Process

1. **Visit**: https://code.earthengine.google.com/register
2. **Sign in** with your Google account
3. **Fill out the form**:
   - Name
   - Institution (if applicable)
   - Purpose of use
   - Country
4. **Accept terms** and submit
5. **Wait for approval** email
6. **Start using** the API

## ✅ Verification

Once authenticated, test with this simple script:

```python
import ee

# Initialize
ee.Initialize()

# Test with a simple image
image = ee.Image('USGS/SRTMGL1_003')
elevation = image.select('elevation')
print("✅ GEE is working!")
print(f"Test elevation: {elevation.getInfo()}")
```

## 🆘 Getting Help

- **Google Earth Engine Documentation**: https://developers.google.com/earth-engine
- **Community Forum**: https://groups.google.com/g/google-earth-engine-developers
- **Code Editor**: https://code.earthengine.google.com/

## 📝 Next Steps

Once authenticated:

1. **Run the climate analysis:**
   ```python
   from main import ClimateDataAnalyzer
   analyzer = ClimateDataAnalyzer()
   results = analyzer.run_complete_analysis_from_gee()
   ```

2. **Customize your analysis:**
   - Edit `config.json` for different states/date ranges
   - Modify analysis parameters in the code

3. **Explore the results:**
   - Check the generated CSV files
   - Analyze heatwave, flood, and drought patterns
