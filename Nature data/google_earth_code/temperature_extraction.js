
// District-wise Daily Temperature (Mean, Min, Max)
// Source: ERA5-Land Daily Aggregated (ECMWF)
// Period: 1967-01-01 to 2025-08-20

var START = '1967-01-01';
var END   = '2025-08-20';
var SCALE_METERS = 9000;
var TILE_SCALE = 4;

var STATES = ["Bihar", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Kerala", "Manipur", "Odisha", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

var gaul2_2024 = ee.FeatureCollection("projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2");

var era = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
  .filterDate(START, END)
  .select(['temperature_2m','temperature_2m_min','temperature_2m_max']);

function toCelsius(img) {
  var meanC = img.select('temperature_2m').subtract(273.15).rename('t2m_mean_C');
  var minC  = img.select('temperature_2m_min').subtract(273.15).rename('t2m_min_C');
  var maxC  = img.select('temperature_2m_max').subtract(273.15).rename('t2m_max_C');
  return meanC.addBands([minC, maxC]).copyProperties(img, img.propertyNames());
}
var eraC = era.map(toCelsius);

function zonalStats(img, districts) {
  var date = img.date().format('YYYY-MM-dd');
  var stats = img.reduceRegions({
    collection: districts,
    reducer: ee.Reducer.mean(),
    scale: SCALE_METERS,
    tileScale: TILE_SCALE
  }).map(function(f) {
    return f.set('date', date);
  });
  return stats;
}

STATES.forEach(function(state) {
  var districts = gaul2_2024.filter(ee.Filter.eq('gaul1_name', state));
  print('Processing:', state, '| Districts:', districts.size());

  var perDayPerDistrict = eraC.map(function(img) {
    return zonalStats(img, districts);
  }).flatten();

  Export.table.toDrive({
    collection: perDayPerDistrict,
    description: 'ERA5Land_DailyTemp_' + state.replace(/\s+/g, '_') + '_1967_2025',
    fileFormat: 'CSV',
    selectors: ['gaul2_name','gaul2_code','date','t2m_mean_C','t2m_min_C','t2m_max_C']
  });
});
