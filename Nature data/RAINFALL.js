// RAINFALL


// Google Earth Code

// =====================================================================
// District-wise Daily Total Rainfall (mm) for Selected Indian States
// Source: ERA5-Land Daily Aggregated (ECMWF)
// Period: 1966-01-01 to today
// Output: One CSV per state with [District, Date, Total Rainfall mm]
// =====================================================================

// ---- SETTINGS ----
var START = '1966-01-01';
var END   = ee.Date(Date.now());  // today
var SCALE_METERS = 9000;          // ERA5 native resolution ~9 km
var TILE_SCALE = 4;

// ---- TARGET STATES ----
var targetStates = [
  'Bihar', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Kerala', 'Manipur', 'Odisha', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

// ---- LOAD DISTRICTS (GAUL 2024) ----
var gaul2_2024 = ee.FeatureCollection("projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2");

// ---- LOAD ERA5-LAND DAILY TOTAL PRECIPITATION ----
var era = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
  .filterDate(START, END)
  .select('total_precipitation_sum');  // in meters

// ---- FUNCTION: Compute daily rainfall (m → mm) ----
function dailyRainfall(img, districts) {
  var date = ee.Date(img.get('system:time_start'));
  
  var stats = img.reduceRegions({
    collection: districts,
    reducer: ee.Reducer.sum(),
    scale: SCALE_METERS,
    tileScale: TILE_SCALE
  }).map(function(f) {
    var rain_mm = ee.Number(f.get('sum')).multiply(1000); // convert m → mm
    return f.set({
      'date': date.format('YYYY-MM-dd'),
      'precip_mm_total': rain_mm
    });
  });
  
  return stats;
}

// ---- LOOP THROUGH STATES ----
targetStates.forEach(function(stateName) {
  var stateDistricts = gaul2_2024.filter(ee.Filter.eq('gaul1_name', stateName));
  
  Map.addLayer(stateDistricts, {}, stateName);
  
  // Map daily rainfall calculation
  var dailyStats = era.map(function(img) {
    return dailyRainfall(img, stateDistricts);
  }).flatten();
  
  // ---- EXPORT ----
  Export.table.toDrive({
    collection: dailyStats,
    description: stateName.replace(/\s/g, '') + '_DailyTotalRainfall_1966_Today',
    fileFormat: 'CSV',
    selectors: ['gaul1_name','gaul2_name','gaul2_code','date','precip_mm_total']
  });
});
