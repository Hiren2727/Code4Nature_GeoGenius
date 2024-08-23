// Import Data
var composite2 = ee.Image("projects/ee-aakashkushwah/assets/FES_Project/FES_Composite"),
    image2 = ee.Image("projects/ee-aakashkushwah/assets/FES_Project/Vegetation_Composite_2000"),
    image = ee.Image("projects/ee-aakashkushwah/assets/FES_Project/Vegetation_Composite_2020"),
    table3 = ee.FeatureCollection("projects/ee-aakashkushwah/assets/FES_Project/RandomPoints"),
    table2 = ee.FeatureCollection("projects/ee-aakashkushwah/assets/FES_Project/RandomPoints_0"),
    image3 = ee.Image("projects/ee-aakashkushwah/assets/FES_Project/Vegetation_Composite_2021");
	
// Define the list of states
var states = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Orissa", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
    "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep",
    "Delhi", "Puducherry", "Jammu and Kashmir", "Ladakh"
];
// Function to classify an image for a given year and state
function classifyYear(year, boundary) {
    var yearlyImage = ee.Image("projects/ee-aakashkushwah/assets/FES_Project/Vegetation_Composite_" + year).clip(boundary.geometry());
    var classifiedImage = yearlyImage.classify(classifier);
    return classifiedImage;
}
// Combine images to get a mean composite image
var combinedImageCollection = ee.ImageCollection([image, image3]);
var meanCompositeImage = combinedImageCollection.mean();
print(meanCompositeImage);

// Define the number of random points to sample
var numRandomPoints = 10000;

// Loop through each state
for (var i = 0; i < states.length; i++) {
    var stateName = states[i];
    var resolution = 500;
    
    // Load the administrative boundaries feature collection
    var adminBoundaries = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level1");
    
    // Filter the administrative boundaries to get the current state
    var stateBoundary = adminBoundaries.filter(ee.Filter.eq('ADM1_NAME', stateName));
    
    // Use image3 for further processing
    var compositeImage = image3;
    
    // Load the WorldCover image collections for land cover types
    var landCoverImg2020 = ee.ImageCollection("ESA/WorldCover/v100");
    var landCoverImg2021 = ee.ImageCollection("ESA/WorldCover/v200");
    
    // Create masks for land cover types
    var landCoverMask2020 = landCoverImg2020.mean().select('Map').lte(10);
    var landCoverMask2021 = landCoverImg2021.mean().select('Map').lte(10);
    
    // Create binary masks and combine them
    var masked2020 = landCoverMask2020.where(landCoverMask2020, 1).updateMask(landCoverMask2020).unmask(0);
    var masked2021 = landCoverMask2021.where(landCoverMask2021, 1).updateMask(landCoverMask2021).unmask(0);
    var combinedMask = masked2020.add(masked2021);

    // Sample random points where pixel value in combinedMask is 1 or 0
    var samplePoints1 = combinedMask.addBands(combinedMask).stratifiedSample({
        numPoints: numRandomPoints,
        classBand: 'Map',
        region: stateBoundary.geometry(),
        scale: 500,
        seed: 1,
        geometries: true
    }).filter(ee.Filter.eq('Map', 2));
    
    var samplePoints0 = combinedMask.addBands(combinedMask).stratifiedSample({
        numPoints: numRandomPoints,
        classBand: 'Map',
        region: stateBoundary.geometry(),
        scale: 500,
        seed: 1,
        geometries: true
    }).filter(ee.Filter.eq('Map', 0));
    
    // Add a constant property 'label' with value 1 to samplePoints1 and 0 to samplePoints0
    var addLabel1 = function(feature) { return feature.set('label', 1); };
    var addLabel0 = function(feature) { return feature.set('label', 0); };
    
    var labeledSamplePoints1 = samplePoints1.map(addLabel1);
    var labeledSamplePoints0 = samplePoints0.map(addLabel0);
    
    // Split data into training and validation sets
    var trainingSamplePoints1 = labeledSamplePoints1.randomColumn().filter(ee.Filter.lt('random', 0.7));
    var trainingSamplePoints0 = labeledSamplePoints0.randomColumn().filter(ee.Filter.lt('random', 0.7));
    
    // Merge training and validation sets
    var allSamplePoints = labeledSamplePoints1.merge(labeledSamplePoints0);
    var trainingSamplePoints = trainingSamplePoints1.merge(trainingSamplePoints0);
    
    // Sample training data from the composite image
    var trainingData = meanCompositeImage.clip(stateBoundary.geometry()).sampleRegions({
        collection: trainingSamplePoints,
        properties: ['label'],
        scale: resolution
    });
    
    // Train a classifier using the training data
    var classifier = ee.Classifier.libsvm().train({
        features: trainingData,
        classProperty: 'label',
        inputProperties: image2.bandNames()
    });
    
    
    // Define the range of years to classify
    var startYear = 2000;
    var endYear = 2002;
    
    // Initialize a list to store forest area results
    var forestAreaResults = ee.List([]);
    
    // Iterate over each year in the range
    ee.List.sequence(startYear, endYear).getInfo().forEach(function(year) {
        var classifiedImage = classifyYear(year, stateBoundary);
        var minPixels = 100;  // Minimum number of pixels to consider as forest
        
        // Label connected components of classified pixels
        var connectedComponents = classifiedImage.connectedComponents({
            connectedness: ee.Kernel.plus(2),
            maxSize: 128
        });
        
        // Extract the labels and calculate the area of each pixel
        var labels = connectedComponents.select('labels');
        var pixelArea = ee.Image.pixelArea().clip(classifiedImage.geometry());
        
        // Sum the areas of pixels in each connected component
        var componentAreas = labels.addBands(pixelArea).reduceConnectedComponents({
            reducer: ee.Reducer.sum(),
            labelBand: 'labels'
        });
        
        // Classify components with sufficient area as 1
        var largeComponentsMask = componentAreas.gte(minPixels);
        var finalClassification = classifiedImage.updateMask(largeComponentsMask);
        
        // Identify forest pixels and calculate their area
        var forestPixels = finalClassification.eq(1);
        var forestPixelArea = forestPixels.multiply(ee.Image.pixelArea());
        var forestArea = forestPixelArea.reduceRegion({
            reducer: ee.Reducer.sum(),
            geometry: stateBoundary.geometry(),
            scale: resolution,
            maxPixels: 1e9
        });
        
        // Extract the forest area value and convert to hectares
        var forestAreaValue = ee.Number(forestArea.get('classification')).divide(10000);
        
        // Add the forest area for the current year to the results list
        forestAreaResults = forestAreaResults.add(ee.Feature(null, {
            'Year': year,
            'Forest_Area': forestAreaValue
        }));
    });
    
    // Convert the list of features to a feature collection
    var forestAreaFeatureCollection = ee.FeatureCollection(forestAreaResults);
    
    // Export the results to Google Drive
    Export.table.toDrive({
        collection: forestAreaFeatureCollection,
        folder: 'Forest_Final_2000_2002',
        description: 'Forest_Area_' + stateName,
        fileFormat: 'CSV'
    });
}
