// Create the main panel for the user interface
var mainPanel = ui.Panel();
mainPanel.style().set({
  width: '380px',
});

// Create and style the title label
var title = ui.Label({
  value: 'Evolving Canopies',
  style: {'fontSize': '26px',  "textAlign":'right','fontWeight': 'bold','fontFamily':'Georgia, serif'} 
});
mainPanel.add(title);

// Create and style the subtitle label
var subtitle = ui.Label({
  value: 'This page shows vegetation cover Indian States and the Forest Time series respectively.',
  style: {'fontSize': '16px', 'textAlign': 'middle'} 
});
mainPanel.add(subtitle);

// Load the state boundaries from an asset
var state = ee.FeatureCollection("projects/ee-akankshayadaw1/assets/FINAL_STATES2");
var stateList = state.aggregate_array('STATE').distinct().sort();

// Populate the state selector with the list of states
stateList.evaluate(function(clientStateList) {
  stateSelector.items().reset(clientStateList);
});

// Create and style the state selection label
var stateLabel = ui.Label({
  value: 'Select a State to display:',
  style: {'fontSize': '16px', 'textAlign': 'middle', 'fontWeight': 'bold'} 
});
mainPanel.add(stateLabel);

// Create and style the state selector dropdown
var stateSelector = ui.Select({
  items: [],
  placeholder: 'Select a state',
  style: {'width': '350px'}
});
mainPanel.add(stateSelector);

// Function to scale NDVI values
function scalemask(image){
  return image.multiply(0.0001);
}

// Function to create a legend entry with a color box and label
function createLegendEntry(color, label, position) {
  var colorBox = ui.Label({
    style: {
      position: position,
      backgroundColor: color,
      padding: '9px',
      margin: '0 0 0 0'
    }
  });
  
  var description = ui.Label({
    value: label,
    style: {margin: '0 0 4px 6px'}
  });

  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
}

// Function to create and display the NDVI anomaly legend
var legend_anomaly = function(){
  var legend1 = ui.Panel({
    style: {
      position: 'bottom-right',
      padding: '8px 15px'
    }
  });

  // Create text on top of the legend
  var panel1 = ui.Panel({
    widgets: [
      ui.Label('NDVI Anomaly'),
    ],
  });
  
  legend1.add(panel1);
  var legendTitle1 = ui.Label({
    style: {
      fontWeight: 'bold',
      fontSize: '18px',
      margin: '0 0 4px 0',
      padding: '0'
    }
  });
  
  var class_c1 = ["#A52A2A","#FFA500","#FFFF00","#FFFFE0","#7CFC00","#4CBB17","#006400","#95A5A6"];
  var label1 = ["Very Stressed","Moderately Stressed ","Lightly Stressed","Normal","Lightly Healthy","Moderately Healthy ","Very Healthy" ,"Missing"];
  for (var j = 0; j < 8; j++){
    legend1.add(createLegendEntry(class_c1[j],label1[j],"bottom-left"));
  }
  Map.add(legend1);
};

// Function to load and display NDVI anomaly based on the selected state
var ndvi = function(){
  var state = stateSelector.getValue();
  var subdistrict = ee.FeatureCollection("projects/ee-akankshayadaw1/assets/FINAL_STATES2");
  var geometry= subdistrict.filter(ee.Filter.eq('STATE', state));
  loadComposite2(state, geometry);
};

stateSelector.onChange(ndvi);

// Function to load composite images and calculate NDVI anomaly
var loadComposite2 = function(state, geometry) {
  Map.clear();
  var outline = ee.Image().byte().paint({
    featureCollection: geometry,
    color: 1,
    width: 1
  });

  Map.addLayer(outline, {palette: ['black']}, 'Administrative Boundary'); 
  Map.centerObject(geometry, 7);
  
  var base = ee.ImageCollection("MODIS/061/MOD13Q1")
    .filter(ee.Filter.date("2001-01-01", "2011-12-31"))
    .filterBounds(geometry)
    .map(scalemask)
    .select('NDVI');
                  
  var current = ee.ImageCollection("MODIS/061/MOD13Q1")
    .filter(ee.Filter.date("2019-01-01","2023-12-31"))
    .filterBounds(geometry)
    .map(scalemask)
    .select('NDVI');
                  
  if (current.size().getInfo() === 0) {
    var caption = ui.Label({
      value: 'No images present.',
      style: {'fontSize': '16px', 'textAlign': 'middle', 'fontWeight': 'bold'} 
    });
    return;
  } else {
    var composite1 = base.mean();
    var ndviComposite = composite1.select('NDVI').clip(geometry);
    var no_w1 = ndviComposite.gt(0).selfMask().rename('no waterbodies');
    var NDVI1 = ndviComposite.multiply(no_w1);

    var composite2 = current.mean();
    var ndviComposite2 = composite2.select('NDVI').clip(geometry);
    var no_w2 = ndviComposite2.gt(0).selfMask().rename('no waterbodies');
    var NDVI2 = ndviComposite2.multiply(no_w2);
    
    // Calculate NDVI anomaly
    var change = ((NDVI2.subtract(NDVI1)).divide(NDVI1)).multiply(100);
    var classes = ee.Image(1)
      .where(change.mask().eq(0), 2)
      .where(change.gt(-75).and(change.lt(30)), 3)
      .where(change.gt(-30).and(change.lt(-10)), 4)
      .where(change.gt(-10).and(change.lt(10)), 5)
      .where(change.gt(10).and(change.lt(30)), 6)
      .where(change.gt(30).and(change.lt(75)), 7)
      .where(change.gt(75), 8);
    
    legend_anomaly();
    Map.addLayer(classes.clip(geometry), {min: 1, max: 8, palette: ["#A52A2A","#95A5A6","#FFA500","#FFFF00","#FFFFE0","#7CFC00","#4CBB17","#006400"]}, "NDVI Anomaly");
  }
};

// Create a panel to display the time series analysis section
var third = ui.Panel();
mainPanel.add(third);

// Create and style the time series analysis label
var box3 = ui.Label({
  value: 'Timeseries Analysis :',
  style: {'fontSize': '20px', 'textAlign': 'left', 'fontWeight': 'bold'} 
});
mainPanel.add(box3);

// Create and style the instruction label for generating the chart
var sub_b = ui.Label({
  value: 'Click to generate the chart:',
  style: {'fontSize': '16px', 'textAlign': 'middle', 'fontWeight': 'bold'} 
});

// Create and style the button to generate the chart
var chart = ui.Button('Generate the Chart');
chart.style().set({
  width: '350px',
});

mainPanel.add(sub_b);
mainPanel.add(chart);

// Clear previous charts when a new state is selected
stateSelector.onChange(function(state) {
  var widgetsToRemove = mainPanel.widgets().filter(function(widget) {
    return widget instanceof ui.Chart;
  });
  widgetsToRemove.forEach(function(widget) {
    mainPanel.remove(widget);
  });
});

// Clear previous charts when the generate chart button is clicked
chart.onClick(function(state) {
  var widgetsToRemove = mainPanel.widgets().filter(function(widget) {
    return widget instanceof ui.Chart;
  });
  widgetsToRemove.forEach(function(widget) {
    mainPanel.remove(widget);
  });
});

// Function to plot the forest area time series
var plot = function() {
  state = stateSelector.getValue();
  var table = ee.FeatureCollection("projects/ee-akankshayadaw1/assets/Akanksha1");
  var filtered = table.filter(ee.Filter.eq('state', state));

  var valueDict = {};
  var years = [];
  for (var year = 2000; year <= 2023; year++) {
    years.push(year.toString());
    valueDict[year] = filtered.aggregate_array(year.toString());
  }
  
  generatechart(years, valueDict);
};

// Function to generate and display the forest area time series chart
var generatechart = function(years, valueDict){
  var chart2 = ui.Chart.array.values({
    array: ee.List(years.map(function(year) {
      return valueDict[year];
    })),
    axis: 0,
    xLabels: years
  }).setOptions({
    title: 'Forest Area Over Years',
    vAxis: {title: 'Forest Area (Hectares)'},
    lineWidth: 2,
    pointSize: 3,
    hAxis: {
      title: 'Year',
      ticks: years.map(function(year) {
        return new Date(year);
      }),
      gridlines: { count: -1, units: { years: {format: 'yyyy'} }, color: 'FFFFFF' },
      minorGridlines: { count: 0 },
      format: 'short'
    },
    colors: ['#bd0026'],
    chartArea: {backgroundColor: 'EBEBEB'},
    legend: {position: "none"}
  });
  mainPanel.add(chart2);
};

chart.onClick(plot);

// Set divider style and add it to the third panel
var s = {};
s.divider = {
  width: '350px',
  backgroundColor: 'F0F0F0',
  height: '5px',
  margin: '20px 5px'
};

third.style().set(s.divider);

// Function to set the basemap and add the main panel to the UI
var basemap = function(){
  Map.setCenter(78.8718, 21.7679, 5);
  ui.root.insert(0, mainPanel);
};

basemap();
