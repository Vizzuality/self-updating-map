CONFIG = {

  lat:     30.849,
  lng:    -28.371,
  zoom:    3,
  maxZoom: 9,
  minZoom: 4,
  userName: 'wsjgraphics02',
  tableName: 'cty0921md',
  refreshInterval: 3000

};

var hoverData = null;
var timeID;

// Styles
var tileStyleData = "#st0921md { line-width:1; line-opacity:1; } \
[status='none'] { line-color: #ffffff; polygon-fill: #eeeeee;  } \
[status='RR']   { line-color: #ffffff; polygon-fill: #c72535;  } \
[status='R']    { line-color: #ffffff; polygon-fill: #c72535;  } \
[status='D']    { line-color: #ffffff; polygon-fill: #5c94ba;  } \
[status='DD']   { line-color: #ffffff; polygon-fill: #0073a2;  } \
[status='I']    { line-color: #999999; polygon-fill: #FFEEC3;  } \
[status='II']   { line-color: #999999; polygon-fill: #FFEEC3;  } \
[status='U']    { line-color: #666666; polygon-fill: #ffffff;  }";

var
request         = null,
geojsonLayer    = new L.GeoJSON(null),
clickLayer      = new L.GeoJSON(null),
popup           = null,
timer           = null,
layer           = null,
map             = null,
lastUpdate      = null;


var // polygon styles
polygonStyle      = { color: "#ff7800", weight: 5, opacity: 0.65, clickable:false },
clickPolygonStyle = { color: "red", weight: 5, opacity: 0.65, clickable:false };


window.cancelRequestAnimFrame = ( function() {
  return window.cancelAnimationFrame       ||
  window.webkitCancelRequestAnimationFrame ||
  window.mozCancelRequestAnimationFrame    ||
  window.oCancelRequestAnimationFrame      ||
  window.msCancelRequestAnimationFrame     ||

  function( callback ){
    window.clearTimeout(timeID);
  };

})();

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame   ||
  window.mozRequestAnimationFrame      ||
  window.oRequestAnimationFrame        ||
  window.msRequestAnimationFrame       ||

  function( callback ){
    timeID = window.setTimeout(callback, 1000 / 60);
  };

})();

function showMessage(message) {

  $(".message").html(message);

  $(".message").animate({ opacity: 1, top: 0 }, { duration: 250, complete: function() {

    setTimeout(function() {
      $(".message").animate({ opacity: 0, top: "-40px" }, 250);
    }, 3000);

  }});
}

function addClickPolygon(data) {

  if (!hoverData) return;

  map.removeLayer(clickLayer);

  var polygon = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [hoverData[data.cartodb_id]]
    }
  };

  clickLayer = new L.GeoJSON(polygon, { style: clickPolygonStyle });
  map.addLayer(clickLayer);

  clickLayer.cartodb_id = data.cartodb_id;
}

function highlightPolygon(data) {

  if (!hoverData) return;

  // Show the hover polygon if it is a different feature
  map.removeLayer(geojsonLayer);

  var polygon = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [hoverData[data.cartodb_id]]
    }
  };

  geojsonLayer = new L.GeoJSON(polygon, { style: polygonStyle });
  map.addLayer(geojsonLayer);

  geojsonLayer.cartodb_id = data.cartodb_id;

}

function onFeatureClick(e, latlng, pos, data) {

  if (typeof( window.event ) != "undefined" ) { // IE
    e.cancelBubble=true;
  } else { // Rest
    e.preventDefault();
    e.stopPropagation();
  }

  // Set popup content
  popup.setContent(data);

  // Set latlng
  popup.setLatLng(latlng);

  // Show it!
  map.openPopup(popup);
  addClickPolygon(data);
}

function onFeatureOut() {

  if (!hoverData) return;

  document.body.style.cursor = "default";
  geojsonLayer.cartodb_id = null;
  geojsonLayer.off("featureparse");
  map.removeLayer(geojsonLayer)

}

function onFeatureHover(e, latlng, pos, data) {
  document.body.style.cursor = "pointer";
  highlightPolygon(data);
}

function createLayer(updatedAt, opacity) {

  return new L.CartoDBLayer({
    map: map,
    user_name:  CONFIG.userName,
    table_name: CONFIG.tableName,
    tile_style: tileStyleData,
    opacity:    opacity,
    query: "SELECT st_name, st_usps, cty0921md.the_geom_webmercator, cty0921md.cartodb_id, states_results.gov_result as status, cty0921md.fips as thecode, cty0921md.st_usps as usps FROM cty0921md, states_results WHERE states_results.usps = cty0921md.st_usps",

    extra_params: {
      cache_buster: updatedAt
    },

    interactivity: "cartodb_id, status, st_usps",

    featureOver: onFeatureHover,
    featureOut: onFeatureOut,
    featureClick: onFeatureClick
  });

}

function onLayerLoaded(layerNew) {

  layerNew.off("load", null, layerNew); // unbind the load event

  showMessage("Map updated");
  var deleted = false;

  var opacity = 0;

  (function animloop(){

    request = requestAnimFrame(animloop);

    layerNew.setOpacity(opacity);
    opacity += .05;

    if (!deleted && opacity >= 1 ) {

      opacity = 0;
      deleted = true;

      $(".last-update").stopwatch('reset');

      cancelRequestAnimFrame(request);

      // Swapp the layers
      map.removeLayer(layer);

      delete layer;
      layer = layerNew;

      map.invalidateSize(false);
    }

  })();

}

var onRefresh = function() {

  var tableName = 'states_results';
  var url = "http://" + CONFIG.userName + ".cartodb.com/api/v2/sql?q=" + escape("SELECT updated_at FROM " + tableName + " ORDER BY updated_at DESC LIMIT 1");

  $.ajax({ url: url, cache: true, jsonpCallback: "callback", dataType: "jsonp", success: function(data) {

    if (!data.rows) {
      data = JSON.parse(data);
    }

    var updatedAt     = data.rows[0].updated_at;
    var updatedAtDate = moment(updatedAt);

    if (updatedAtDate > lastUpdate) { // Update the map

      if (!layer) { // create layer

        layer = createLayer(updatedAt, 1);

        map.addLayer(layer, false);

        $(".last-update").stopwatch('start');

      } else { // update layer

        showMessage("New data coming…");

        // popup._close();

        var layerNew = createLayer(updatedAt, 0);
        map.addLayer(layerNew, false);


        layerNew.on("load", function() {

          onLayerLoaded(this);

        });


      }

      lastUpdate = updatedAtDate;

    }

  }});

  if (!timer) {
    timer = setInterval(onRefresh, CONFIG.refreshInterval);
  }

}

function getHoverData() {

  var url = "http://com.cartodb.uselections.s3.amazonaws.com/hover_geoms/cty0921md_01.js";

  $.ajax({ url: url, jsonpCallback: "callback", dataType: "jsonp", success: function(data) {
    hoverData = data;
  }});

}

function initialize() {

  // Initialize stopwatch
  $('.last-update').stopwatch({format: 'Last update: <strong>{Minutes} and {seconds} ago</strong>'});

  // Initialize the popup
  popup = new L.CartoDBPopup();

  getHoverData();

  var mapOptions = {
    center: new L.LatLng(CONFIG.lat, CONFIG.lng),
    zoom: CONFIG.zoom,
    maxZoom: CONFIG.maxZoom,
    minZoom: CONFIG.minZoom,
    zoomAnimation: true,
    fadeAnimation: true
  };

  map = new L.Map('map', mapOptions);

  map.on("popupclose", function() {
    map.removeLayer(clickLayer);
  });

  onRefresh(); // Start!

}
