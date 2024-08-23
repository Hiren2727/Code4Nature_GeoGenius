// Load the administrative boundaries for India from FAO GAUL dataset
var indiaBoundaries = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0");
var india = indiaBoundaries.filter(ee.Filter.eq('ADM0_NAME', 'India'));

// Define cloud masking functions for different MODIS products
var maskMOD13Q1Clouds = function(image) {
  var qa = image.select('SummaryQA');
  // Use only data where bits 0-1 of 'SummaryQA' are less than 2 (good or marginal data)
  var mask = qa.bitwiseAnd(3).lt(2);
  return image.updateMask(mask);
};

var maskMCD15A3HClouds = function(image) {
  var qa = image.select('FparExtra_QC');
  // Use only data where bits 0-1 of 'FparExtra_QC' are less than 2 (good or marginal data)
  var mask = qa.bitwiseAnd(3).lt(2);
  return image.updateMask(mask);
};

// Load and apply cloud masking to MODIS image collections
var modisNDVI = ee.ImageCollection("MODIS/061/MOD13Q1").map(maskMOD13Q1Clouds);
var modisLAI = ee.ImageCollection("MODIS/061/MCD15A3H").map(maskMCD15A3HClouds);
var modisNDWI = ee.ImageCollection("MODIS/MOD09GA_006_NDWI");

// Function to generate annual composite with multiple bands for a given year
function generateAnnualComposite(year) {

  // Functions to get monthly statistics for NDVI, EVI, and LAI
  function getMonthlyMedianNDVI(month) {
    var filtered = modisNDVI.filter(ee.Filter.calendarRange(2000,2023, 'year'))
                            .filter(ee.Filter.calendarRange(month, month, 'month'))
                            .select('NDVI');
    return filtered.median().rename('NDVI_Median_Month_' + month);
  }

  function getMonthlyMeanNDVI(month) {
    var filtered = modisNDVI.filter(ee.Filter.calendarRange(2000,2023, 'year'))
                            .filter(ee.Filter.calendarRange(month, month, 'month'))
                            .select('NDVI');
    return filtered.mean().rename('NDVI_Mean_Month_' + month);
  }

  function getMonthlyMaxNDVI(month) {
    var filtered = modisNDVI.filter(ee.Filter.calendarRange(2000,2023, 'year'))
                            .filter(ee.Filter.calendarRange(month, month, 'month'))
                            .select('NDVI');
    return filtered.max().rename('NDVI_Max_Month_' + month);
  }

  function getMonthlyRangeNDVI(month) {
    var filtered = modisNDVI.filter(ee.Filter.calendarRange(2000,2023, 'year'))
                            .filter(ee.Filter.calendarRange(month, month, 'month'))
                            .select('NDVI');
    var range = filtered.max().subtract(filtered.min());
    return range.rename('NDVI_Range_Month_' + month);
  }

  function getMonthlyStdDevNDVI(month) {
    var filtered = modisNDVI.filter(ee.Filter.calendarRange(2000,2023, 'year'))
                            .filter(ee.Filter.calendarRange(month, month, 'month'))
                            .select('NDVI');
    return filtered.reduce(ee.Reducer.stdDev()).rename('NDVI_StdDev_Month_' + month);
  }

  function getMonthlyMedianEVI(month) {
    var filtered = modisNDVI.filter(ee.Filter.calendarRange(2000,2023, 'year'))
                            .filter(ee.Filter.calendarRange(month, month, 'month'))
                            .select('EVI');
    return filtered.median().rename('EVI_Median_Month_' + month);
  }

  function getMonthlyMeanEVI(month) {
    var filtered = modisNDVI.filter(ee.Filter.calendarRange(2000,2023, 'year'))
                            .filter(ee.Filter.calendarRange(month, month, 'month'))
                            .select('EVI');
    return filtered.mean().rename('EVI_Mean_Month_' + month);
  }

  function getMonthlyMaxEVI(month) {
    var filtered = modisNDVI.filter(ee.Filter.calendarRange(2000,2023, 'year'))
                            .filter(ee.Filter.calendarRange(month, month, 'month'))
                            .select('EVI');
    return filtered.max().rename('EVI_Max_Month_' + month);
  }

  function getMonthlyRangeEVI(month) {
    var filtered = modisNDVI.filter(ee.Filter.calendarRange(2000,2023, 'year'))
                            .filter(ee.Filter.calendarRange(month, month, 'month'))
                            .select('EVI');
    var range = filtered.max().subtract(filtered.min());
    return range.rename('EVI_Range_Month_' + month);
  }

  function getMonthlyStdDevEVI(month) {
    var filtered = modisNDVI.filter(ee.Filter.calendarRange(2000,2023, 'year'))
                            .filter(ee.Filter.calendarRange(month, month, 'month'))
                            .select('EVI');
    return filtered.reduce(ee.Reducer.stdDev()).rename('EVI_StdDev_Month_' + month);
  }

  // Filter NDVI data for the given year and region (India)
  var filteredNDVI = modisNDVI.filter(ee.Filter.date(2000 + '-01-01', 2000 + '-12-31'))
                              .filter(ee.Filter.bounds(india))
                              .select('NDVI');

  // Create a composite of the filtered NDVI data
  var composite = filteredNDVI.median().clip(india);

  // Add monthly statistics bands to the composite
  for (var month = 1; month <= 12; month++) {
    composite = composite.addBands(getMonthlyMedianNDVI(month));
    composite = composite.addBands(getMonthlyMeanNDVI(month));
    composite = composite.addBands(getMonthlyMaxNDVI(month));
    composite = composite.addBands(getMonthlyRangeNDVI(month));
    composite = composite.addBands(getMonthlyStdDevNDVI(month));
    composite = composite.addBands(getMonthlyMedianEVI(month));
    composite = composite.addBands(getMonthlyMeanEVI(month));
    composite = composite.addBands(getMonthlyMaxEVI(month));
    composite = composite.addBands(getMonthlyRangeEVI(month));
    composite = composite.addBands(getMonthlyStdDevEVI(month));
  }

  return composite;
}

// Generate the annual composite for the year 2000 (or any desired year)
var annualComposite = generateAnnualComposite();

// Export the generated composite to an asset
Export.image.toAsset({
  image: annualComposite,
  description: 'Training Data',
  assetId: 'Training Data',
  scale: 500,
  region: india,
  maxPixels: 1e13
});

// Print the composite to the console
print('Training Data:', annualComposite);
