// Load GAUL 2024 Level 2 (District) boundaries filtered for India
var districts = ee.FeatureCollection("projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2")
                 .filter(ee.Filter.eq('gaul0_name', 'India'));

// Load SRTM DEM and mask ocean and invalid data
var srtm = ee.Image("USGS/SRTMGL1_003");
var srtm_land = srtm.updateMask(srtm.gte(0));

// Map over districts to calculate elevation statistics
var districtsElevationStats = districts.map(function(feature) {
  var stats = srtm_land.reduceRegion({
    reducer: ee.Reducer.mean()
                 .combine({reducer2: ee.Reducer.min(), sharedInputs: true})
                 .combine({reducer2: ee.Reducer.max(), sharedInputs: true}),
    geometry: feature.geometry(),
    scale: 30,
    maxPixels: 1e13
  });

  // Ensure minimum elevation not less than zero
  var minElev = ee.Number(stats.get('elevation_min')).max(0);

  return feature.set({
    'state_name': feature.get('gaul1_name'),
    'district_name': feature.get('gaul2_name'),
    'avg_elev_m': stats.get('elevation_mean'),
    'min_elev_m': minElev,
    'max_elev_m': stats.get('elevation_max')
  });
});

// Select columns for export (excluding geometry)
var exportTable = districtsElevationStats.select(['state_name', 'district_name', 'avg_elev_m']);

// Export the result as CSV
Export.table.toDrive({
  collection: exportTable,
  description: 'India_District_Avg_Elevation_GAUL2024',
  fileFormat: 'CSV'
});

// Preview a sample in the console
print(exportTable.limit(10));
