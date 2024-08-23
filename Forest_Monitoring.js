// Create MainPanel with all the requireds widgets
var mainPanel = ui.Panel();
mainPanel.style().set({
  width: '380px',
  
});

//title label
var title = ui.Label({
  value: 'FOREST DYNAMICS',
  style: {'fontSize': '26px',  "textAlign":'right','fontWeight': 'bold','fontFamily':'Georgia, serif'} 
});
mainPanel.add(title);

//description
var subtitle = ui.Label({
  value: 'This page shows vegetation cover for National Parks from 2019 to present.',
  style: {'fontSize': '16px', 'textAlign': 'middle'} 
});
mainPanel.add(subtitle);

var dropdownPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
});
mainPanel.add(dropdownPanel);

// Access the national park file
var shp = ee.FeatureCollection("projects/ee-akankshayadaw1/assets/PAs");
var sub =  shp.filter(ee.Filter.eq('desig', "National Park"));
var shplist = sub.aggregate_array('name').distinct().sort();

//Populate with the name of National Park
shplist.evaluate(function(clientshplist) {
  shpSelector.items().reset(clientshplist);
});


var shpSelector = ui.Select({
  items:[],
  placeholder: 'Select a National Park',
  style:{'width': '350px'}
  });
dropdownPanel.add(shpSelector);

var divider = ui.Panel();
mainPanel.add(divider);

// Present Analysis for 15 days
var box1 = ui.Label({
  value: 'Present Analysis :',
  style: {'fontSize': '20px', 'textAlign': 'left','fontWeight': 'bold'} 
});
mainPanel.add(box1);

var subtitle1 = ui.Label({
  value: 'To generate the NDVI for last 15 days using Sentinel-2 data.',
  style: {'fontSize': '16px', 'textAlign': 'middle'} 
});
mainPanel.add(subtitle1);

var dropdownPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
});
mainPanel.add(dropdownPanel);

var sub1 = ui.Label({
  value: 'Generate NDVI for last 15 days:',
  style: {'fontSize': '16px', 'textAlign': 'middle','fontWeight': 'bold'} 
});
dropdownPanel.add(sub1);

var button = ui.Button('NDVI Last 15 Days');
button.style().set({
  width: '350px',
});
dropdownPanel.add(button);

var second = ui.Panel();
dropdownPanel.add(second);

// Long term Monthly Analysis 
var box2 = ui.Label({
  value: 'Long-Term Analysis :',
  style: {'fontSize': '20px', 'textAlign': 'left','fontWeight': 'bold'} 
});
dropdownPanel.add(box2);

//year
var subtitle = ui.Label({
  value: 'Select a Year to display:',
  style: {'fontSize': '16px', 'textAlign': 'middle','fontWeight': 'bold'} 
});
dropdownPanel.add(subtitle);
var yearSelector = ui.Select({
  placeholder: 'please wait..',
  style:{'width': '350px'}
});

// Populate the year from 2019 to 2024;
dropdownPanel.add(yearSelector);
var years = ee.List.sequence(2019, 2024);
var yearStrings = years.map(function(year){
  return ee.Number(year).format('%04d');
});
yearStrings.evaluate(function(yearList) {
  yearSelector.items().reset(yearList);
  yearSelector.setPlaceholder('select a year');
});

//month
var subtitle = ui.Label({
  value: 'Select a Month to display:',
  style: {'fontSize': '16px', 'textAlign': 'middle','fontWeight': 'bold'} 
});
dropdownPanel.add(subtitle);

var monthDict = {
  'January': '01',
  'February': '02',
  'March': '03',
  'April': '04',
  'May': '05',
  'June': '06',
  'July': '07',
  'August': '08',
  'September': '09',
  'October': '10',
  'November': '11',
  'December': '12'
};

var monthSelector = ui.Select({
  items: Object.keys(monthDict),
  placeholder: 'please wait..',
  style:{'width': '350px'},
});
dropdownPanel.add(monthSelector);
monthSelector.setPlaceholder('select a month');

var dropdownPanel2 = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
});
mainPanel.add(dropdownPanel2);


var button3 = ui.Button('Run');
dropdownPanel2.add(button3);
button3.style().set({
  width: '165px',
  padding: '20px',
  margin: 'auto'
});


// function to mask the layers of cloud,defective or dark pixela
function sclmask(image){
    var scl = image.select('SCL');
    var mask = (scl.gte(1).and(scl.lt(4))).or(scl.gt(7).and(scl.lte(11)));
    return image.updateMask(mask.eq(0)).divide(10000);
  } 

// function to calculate NDVI
function addNDVI(image) {
    var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI'); 
    return image.addBands(ndvi);
  }

// function to create Legend
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

// legend for ndvi layer

var legend_ndvi=function(){
   var legend = ui.Panel({
      style: {
      position: 'bottom-left',
      padding: '8px 15px'
      }
      });

        var panel = ui.Panel({
        widgets: [
        ui.Label('NDVI Index'),
        ],
        });
        
      legend.add(panel);
      
      var class_c =["#fffee4","#f7fdb8","#d8f1a3","#acdd8f","#78c679","#40ab5c","#006936","#95A5A6","#0000ff"];
      var label = ["0.1","0.2","0.3","0.4","0.5","0.6",">0.6" ,"Missing", "WaterBodies"];
      
  
      for (var i =0 ; i<9; i++){
        legend.add(createLegendEntry(class_c[i],label[i],"bottom-left"));
      }
      
      var category = ["Barren (0-0.2)", "Unhealthy (0.2-0.3)", "Healthy (0.3-0.5)", "Moderately Healthy (0.5-0.6)", "Strongly Healthy (>0.6)"];

      var newpanel = ui.Panel();

      category.forEach(function(catText) {
        var cat = ui.Label({
          value: catText,
          style: {'fontWeight': 'bold'}
        });
        newpanel.add(cat);
      });
      
      newpanel.style().set({
        position: 'bottom-left',
      });
      
      
    return { newpanel: newpanel, legend: legend };
};

// legend for anomaly layer
var legend_anomaly = function(){

  var legend1 = ui.Panel({
  style: {
  position: 'bottom-right',
  padding: '8px 15px'
  }
  });
  // create text on top of legend
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
  for (var j =0 ; j<8; j++){
    legend1.add(createLegendEntry(class_c1[j],label1[j],"bottom-left"));
  }
  rightMap.add(legend1);
};

// function for NDVI of last 15 days
var cc = function(){
      
      base.layers().reset();
      basemap();
      
      var selected_NP = shpSelector.getValue();

      var geometry = shp.filter(ee.Filter.eq('name',selected_NP ));
      base.centerObject(geometry,11);

      var outline = ee.Image().byte().paint({
      featureCollection: geometry,
      color: 1,
      width: 1
      });
      
      // Calulate the start date and end date for 15 day time period
      var endDate = (ee.Date(Date.now())); 
      var startDate = endDate.advance(-14, 'day');
      var date = function(date){
      return date.format('YYYY-MM-dd');
      };
      
 
      var date2 = function(date){
      return date.format('dd-MM-YYYY').getInfo();
      };
      var s =date2(startDate);
      var e =date2(endDate);
 
      var label= ui.Label('NDVI from ' + s + ' to ' + e);
      label.style().set('position','top-center');
      
      // call the ndvi function
      var add = loadComposite(selected_NP,startDate,endDate,geometry);
      
      // add the layer
      base.addLayer(add.clip(geometry), {min:1, max:9, palette: ["#0000FF","#fffee4","#f7fdb8","#d8f1a3","#acdd8f","#78c679","#40ab5c","#006936","#95A5A6"]},"NDVI");
      base.addLayer(outline,{palette:['black']},"Administrative Boundary");
      base.add(label);
      
      var panels = legend_ndvi();
      base.add(panels.newpanel);
      base.add(panels.legend);

  }; 

button.onClick(cc);  

// Calculate the NDVI 
var loadComposite = function(selected_NP, startDate, endDate, geometry) {
 
  var col = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                  .filter(ee.Filter.date(startDate, endDate))
                  .filterBounds(geometry)
                  .map(sclmask);
           
  // condition if no images are present 
  if (col.size().getInfo() === 0) {
  var caption = ui.Label({
  value: 'No images present.',
  style: {'fontSize': '16px', 'textAlign': 'middle','fontWeight': 'bold'} 
  });
  mainPanel.add(caption);
  return;
  } else {
    var withNDVI = col.map(addNDVI);
    var composite1 = withNDVI.mean();
    var NDVI = composite1.select('NDVI').clip(geometry);
    // classify the ndvi into classes as per the value
    var class1 = ee.Image(0)
                  .where(NDVI.lt(0),1)
                  .where(NDVI.gt(0).and (NDVI.lt(0.1)),2)
                  .where(NDVI.gt(0.1).and (NDVI.lt(0.2)),3)
                  .where(NDVI.gt(0.2).and (NDVI.lt(0.3)),4)
                  .where(NDVI.gt(0.3).and (NDVI.lt(0.4)),5)
                  .where(NDVI.gt(0.4).and (NDVI.lt(0.5)),6)
                  .where(NDVI.gt(0.5).and (NDVI.lt(0.6)),7)
                  .where(NDVI.gt(0.6),8)
                  .where(NDVI.mask().eq(0),9);
    return class1;
}};


// Calculate the NDVI Anomaly
var loadComposite2 = function(selected_NP, startDate, endDate, geometry) {

  var current = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                  .filter(ee.Filter.date(startDate, endDate))
                  .filterBounds(geometry)
                  .map(sclmask);
                  
  var month_extract = startDate.get('month');
  
  // Reference Data to select the month selected to find the anomaly
  var col = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                  .filter(ee.Filter.date('2019-01-01', '2023-12-31'))
                  .filter(ee.Filter.calendarRange(month_extract,month_extract,'month'))
                  .filterBounds(geometry)
                  .map(sclmask);
                  
  // condition if no images are present 
  if (col.size().getInfo() === 0) {
  var caption = ui.Label({
  value: 'No images present.',
  style: {'fontSize': '16px', 'textAlign': 'middle','fontWeight': 'bold'} 
  });
  return;
  } else {
    var withNDVI1 = current.map(addNDVI);
    var composite1 = withNDVI1.mean();
    var ndviComposite = composite1.select('NDVI').clip(geometry);
  
    var no_w1 = ndviComposite.gt(0)
                          .selfMask()
                          .rename('no waterbodies');
    var NDVI1 = ndviComposite.multiply(no_w1);
    
    var withNDVI2 = col.map(addNDVI);
    var composite2 = withNDVI2.mean();
    var ndviComposite2 = composite2.select('NDVI').clip(geometry);

    var no_w2 = ndviComposite2.gt(0)
                          .selfMask()
                          .rename('no waterbodies');
    var NDVI2 = ndviComposite2.multiply(no_w2);
    
    // find anomaly
    var change = ((NDVI1.subtract(NDVI2)).divide(NDVI2)).multiply(100);
    // classify the ndvi into classes as per the value
    var classes = ee.Image(1)
                  .where(change.mask().eq(0),2)
                  .where(change.gt(-75).and (change.lt(30)),3)
                  .where(change.gt(-30).and (change.lt(-10)),4)
                  .where(change.gt(-10).and (change.lt(10)),5)
                  .where(change.gt(10).and (change.lt(30)),6)
                  .where(change.gt(30).and (change.lt(75)),7)
                  .where(change.gt(75),8);
  return classes;
}};

// Two Maps for the Split Panel
var leftMap = ui.Map();
var rightMap = ui.Map();

// Create a Split Panel App
var splitPanel = ui.SplitPanel({
firstPanel: leftMap,
secondPanel: rightMap,
orientation: 'horizontal',
wipe: true
});

var splitpanel = function() {
  
  // Reset the layers
  leftMap.layers().reset(); 
  rightMap.layers().reset(); 
  leftMap.widgets().reset();
  rightMap.widgets().reset();
   
  var selected_NP = shpSelector.getValue();
  
  var year = yearSelector.getValue();
  var monthlabel = monthSelector.getValue();
  var month  = monthDict[monthlabel];

  
  var startDate = ee.Date.fromYMD(
    ee.Number.parse(year), ee.Number.parse(month), 1);
  var edate = startDate.advance(1, 'month');
  var endDate = edate.advance(-1, 'day');
  

  var subdistrict = ee.FeatureCollection("projects/ee-akankshayadaw1/assets/PAs");
  var geometry= subdistrict.filter(ee.Filter.eq('name', selected_NP));
  var outline = ee.Image().byte().paint({
  featureCollection: geometry,
  color: 1,
  width: 1
});

  // Set the center to the geometry
  var centroid = geometry.geometry().centroid();
  var centroidCoordinates = centroid.coordinates();
  var lon = centroidCoordinates.get(0).getInfo();
  var lat = centroidCoordinates.get(1).getInfo();

   rightMap.setCenter(lon,lat, 11);
   leftMap.setCenter(lon,lat, 11);
  var linker = ui.Map.Linker([leftMap, rightMap]);
  
  
  ui.root.widgets().reset([mainPanel, splitPanel]);

  // call for calulation of the two layers
  var left= loadComposite(selected_NP,startDate, endDate, geometry);
  var right = loadComposite2(selected_NP,startDate, endDate, geometry);
  
  // add the layera
  var panels = legend_ndvi();
  leftMap.add(panels.newpanel);
  leftMap.add(panels.legend);
  legend_anomaly();
  
  // add two maps
  rightMap.addLayer(right.clip(geometry), {min:1, max:8, palette: ["#A52A2A","#95A5A6","#FFA500","#FFFF00","#FFFFE0","#7CFC00","#4CBB17","#006400"]},"NDVI Anomaly");
  rightMap.addLayer(outline, {palette: ['black']}, 'AOI'); 
  
  leftMap.addLayer(left.clip(geometry), {min:1, max:9, palette: ["#0000FF","#fffee4","#f7fdb8","#d8f1a3","#acdd8f","#78c679","#40ab5c","#006936","#95A5A6"]});
  leftMap.addLayer(outline, {palette: ['black']}, 'Administrative Boundary'); 
  
  
  
};
button3.onClick(function(){
  splitpanel();
});

// Create a base map
var base;

var basemap = function(){
  ui.root.clear();
  base = ui.Map();
  ui.root.add(base);
  base.setCenter(78.8718,21.7679, 5);
  ui.root.insert(0,mainPanel);
};

// Reset option after each click
var resetMap = function() { 
  leftMap.layers().reset(); 
  rightMap.layers().reset(); 
  leftMap.widgets().reset();
  rightMap.widgets().reset();
  basemap();
};


basemap();

var third = ui.Panel();
mainPanel.add(third);


// styles
var s = {};
s.divider = {
  width:'350px',
  backgroundColor: 'F0F0F0',
  height: '5px',
  margin: '20px 5px'
};
divider.style().set(s.divider);
second.style().set(s.divider);
