// Create the main panel
var mainPanel = ui.Panel();
mainPanel.style().set({
  width: '400px',
  
});

// Add a title to the main panel
var title = ui.Label({
  value: 'LULC Classification',
  style: {'fontSize': '26px',  "textAlign":'right','fontWeight': 'bold','fontFamily':'Georgia, serif'} 
});
mainPanel.add(title);

// Add a subtitle to the main panel
var subtitle = ui.Label({
  value: 'This page shows LULC Classification.',
  style: {'fontSize': '16px', 'textAlign': 'middle'} 
});
mainPanel.add(subtitle);

// Create a dropdown panel for selecting National Parks
var dropdownPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
});
mainPanel.add(dropdownPanel);


// Add a label to the dropdown panel
var subtitle = ui.Label({
  value: 'Select a National Park to display:',
  style: {'fontSize': '16px', 'textAlign': 'middle','fontWeight': 'bold'} 
});
dropdownPanel.add(subtitle);

// Load the FeatureCollection of National Parks
var shp = ee.FeatureCollection("projects/ee-akankshayadaw1/assets/PAs");
var sub =  shp.filter(ee.Filter.eq('desig', "National Park"));
var shplist = sub.aggregate_array('name').distinct().sort();



// Populate the dropdown with National Park names
shplist.evaluate(function(clientshplist) {
  shpSelector.items().reset(clientshplist);
});

// Create the dropdown selector for National Parks
var shpSelector = ui.Select({
  items:[],
  placeholder: 'Select a National Park',
  style:{'width': '350px'}
  });
dropdownPanel.add(shpSelector);


// Initialize the map
var base;

var basemap = function(){
  ui.root.clear();
  base = ui.Map();
  ui.root.add(base);
  base.setCenter(78.8718,21.7679, 5);
  ui.root.insert(0,mainPanel);
};

basemap();

// Create a button to display LULC
var button = ui.Button("LULC");
button.style().set({
  width:"350px",
  padding:'10px 0px 0px 0px'
});
mainPanel.add(button);


// Function to create a legend entry
function createLegendEntry(color, label, position) {
    
  var colorBox = ui.Label({
    style: {
      position: position,
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 0 0'
    }
  });
  
  var description = ui.Label({
    value: label,
    style: {margin: '0 0 6px 6px'}
  });

  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
  }

// Event handler for National Park selection change

shpSelector.onChange(function(np) {
 
  var widgetsToRemove = mainPanel.widgets().filter(function(widget) {
    return widget instanceof ui.Chart;
  });
  
  widgetsToRemove.forEach(function(widget) {
    mainPanel.remove(widget);
  });
  base.clear();
  base.setCenter(78.8718,21.7679, 5);
});

  // Event handler for button click
  button.onClick(function(np) {
    
  var widgetsToRemove = mainPanel.widgets().filter(function(widget) {
    return widget instanceof ui.Chart;
  });
  
  widgetsToRemove.forEach(function(widget) {
    mainPanel.remove(widget);
  });
  
});

// Function to reset the chart
var resetchart = function(){
  var widgetsToRemove = mainPanel.widgets().filter(function(widget) {
    return widget instanceof ui.Chart;
  });
  widgetsToRemove.forEach(function(widget) {
    mainPanel.remove(widget);
  });
};



// Function to display LULC 
var display = function(){
      
      basemap();
      resetchart();
      var selectedNP = shpSelector.getValue();
      
      var shp = ee.FeatureCollection("projects/ee-akankshayadaw1/assets/PAs");
      var sub =  shp.filter(ee.Filter.eq('desig', "National Park"));
      var sub2 =  sub.filter(ee.Filter.eq('name', selectedNP));
      var geometry = sub2.geometry();
      
      // Outline the selected National Park
      var outline = ee.Image().byte().paint({
      featureCollection: geometry,
      color: 1,
      width: 3
      });
      
      base.addLayer(outline,{palette:['black']},"Administrative Boundary");
      base.centerObject(geometry,11);
      
      var worldcover = ee.ImageCollection('ESA/WorldCover/v200').first().clip(geometry);

      
      var classified = worldcover.remap(
        [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100],
        [0,  1 , 2,  3,  4,  5,  6,  7,  8,  9,  10]).rename('classification');
      
      // Define a list of class names
      var worldCoverClassNames= [
        'Tree Cover', 'Shrubland', 'Grassland', 'Cropland', 'Built-up',
        'Bare / sparse Vegetation', 'Snow and Ice', 
        'Permanent Water Bodies', 'Herbaceous Wetland', 
        'Mangroves', 'Moss and Lichen'];
      // Define a list of class colors
      var worldCoverPalette = [
        '006400', '#67e601', '#00FF7F', '#fed27e', 'fa0000',
        '#dec29c', 'f0f0f0', '#01e0fe', '0096a0', '#bbff68',
        '#fefe69'];
        
     // define a dictionary with class names
      var classNames = ee.Dictionary.fromLists(
        ['0','1','2','3','4','5','6','7','8','9', '10'],
        worldCoverClassNames
      );
      // define a dictionary with class colors
      var classColors = ee.Dictionary.fromLists(
        ['0','1','2','3','4','5','6','7','8','9', '10'],
        worldCoverPalette
      );
      var visParams = {min:0, max:10, palette: worldCoverPalette};
      base.addLayer(classified, visParams, 'Landcover');
      
      // Create an area image and convert to Hectares
      var areaImage = ee.Image.pixelArea().divide(1e4);
      
      // Add the band containing classes
      var areaImageWithClass = areaImage.addBands(classified);
      
      // As charting functions do not work on more than
      // 10000000 pixels, we need to extract the areas using
      // a reducer and create a FeatureCollection first
      
      // Use a Grouped Reducer to calculate areas
      var areas = areaImageWithClass.reduceRegion({
            reducer: ee.Reducer.sum().group({
            groupField: 1,
            groupName: 'classification',
          }),
          geometry: geometry,
          scale: 10,
          maxPixels: 1e10
          }); 
       
      var classAreas = ee.List(areas.get('groups'));
      
      // Process results to extract the areas and
      // create a FeatureCollection
      var classAreaList = classAreas.map(function(item) {
        var areaDict = ee.Dictionary(item);
        var classNumber = areaDict.getNumber('classification').format();
        var classArea = areaDict.getNumber('sum');
        var className = classNames.get(classNumber);
        var classColor = classColors.get(classNumber);
        // Create a feature with geometry and 
        // required data as a dictionary
        return ee.Feature(geometry, {
          'class': classNumber,
          'class_name': className,
          'Area': classArea,
          'color': classColor
        });
      });
      
      var classAreaFc = ee.FeatureCollection(classAreaList);
      
      // print('Class Area (FeatureCollection)', classAreaFc);
      
      
      var chart = ui.Chart.feature.byFeature({
        features: classAreaFc,
        xProperty: 'class_name',
        yProperties: ['Area']
      }).setChartType('PieChart')
      .setOptions({
        title: 'Area by class',
      });

      var colors = classAreaFc.aggregate_array('color');
      
      // The variable 'colors' is a server-side object
      // Use evaluate() to convert it to client-side
      // and use the results in the chart
      
      colors.evaluate(function(colorlist) {
        // Let's create a Pie Chart
        var areaChart = ui.Chart.feature.byFeature({
          features: classAreaFc,
          xProperty: 'class_name',
          yProperties: ['Area']
        }).setChartType('PieChart').setOptions({
            title: 'Area By Class for ' + selectedNP,
            titleTextStyle:{ fontSize: '100px',
              margin : "20px 0px 20px 0px",
            },
            colors: colorlist,
            // pieSliceBorderColor: '#fafafa',
            pieSliceTextStyle: {'color': '#FFFFFF'}, 
            pieSliceText: 'percentage',
            sliceVisibilityThreshold: "0",
            pieHole: "0.4",
            // is3D: true,
            chartArea:{width:'45%',height:'80%'},
          //   slices: {  4: {offset: 0.2},
          //           1: {offset: 0.1},
          //           2: {offset: 0.04},
          //           5: {offset: 0.05},
          // },
        });
       mainPanel.add(areaChart) 
      });
      var legend = ui.Panel({
      style: {
      position: 'bottom-left',
      padding: '8px 15px'
      }
      });
      // create text on top of legend
        var panel = ui.Panel();

        var lulc = ui.Label('LULC Index');
        lulc.style().set({
          'fontWeight': 'bold',
          'textAlign':'center'
        });
      panel.add(lulc);
      legend.add(panel);
   
      var class_c =['006400', '#67e601', '#00FF7F', '#fed27e', 'fa0000',
        '#dec29c', 'f0f0f0', '#01e0fe', '0096a0', '#bbff68',
        '#fefe69'];
        
      var label = ['Tree Cover', 'Shrubland', 'Grassland', 'Cropland', 'Built-up',
        'Bare / sparse Vegetation', 'Snow and Ice', 
        'Permanent Water Bodies', 'Herbaceous Wetland', 
        'Mangroves', 'Moss and Lichen'];
        
      label.forEach(function(label) {
      var uiLabel = ui.Label(label);
        uiLabel.style().set({
          'fontSize': '15px'
        });
      });
        
      for (var i =0 ; i<11; i++){
        legend.add(createLegendEntry(class_c[i],label[i],"bottom-left"));
      }
      
   base.add(legend);
};

// Set the button to display the LULC information when clicked
button.onClick(display);

