var c = null;

// Colors
var darkerRed = '#850713';
var fullRed = '#c72535';
var fullRed_tint = '#f4d3d7';
var mediumRed = '#d77464';
var mediumRed_tint = '#f7e3e0';
var fullBlue = '#0073a2';
var fullBlue_tint = '#cce3ec';
var mediumBlue = '#5c94ba';
var mediumBlue_tint = '#deeaf1';
var mediumGray = '#ffffff';
var lightGray = '#f7f7f7';
var mediumGray_tint_tint = '#f4edf9';
var darkerBlue = '#035170';
var indepClr = '#FFEEC3';
var indBG = '#F5C95B';
var jsontype = ($.browser.msie) ? "jsonp" : "json";

var tileStyleData = "#st0921md{line-width:1;line-opacity:1;}[status='none']{line-color:" + '#ffffff' + ";polygon-fill:" + '#eeeeee' + "}[status='RR']{line-color:" + mediumGray + ";polygon-fill:" + fullRed + "}[status='R']{line-color:" + mediumGray + ";polygon-fill:" + mediumRed + ";polygon-pattern-file:url('http://graphics.wsj.com/documents/images/hatch16mm.png')}[status='D']{line-color:" + mediumGray + ";polygon-fill:" + mediumBlue + ";polygon-pattern-file:url('http://graphics.wsj.com/documents/images/hatch16mm.png')}[status='DD']{line-color:" + mediumGray + ";polygon-fill:" + fullBlue + "}[status='I']{line-color:" + '#999999' + ";polygon-fill:" + indepClr + ";polygon-pattern-file:url('http://graphics.wsj.com/documents/images/hatch16mm.png')}[status='II']{line-color:" + '#999999' + ";polygon-fill:" + indepClr + "}[status='U']{line-color:" + '#666666' + ";polygon-fill:" + mediumGray + ";polygon-pattern-file:url('http://graphics.wsj.com/documents/images/hatch16mm.png')}";
window.refresh = false;

  var timeID;

  window.cancelRequestAnimFrame = ( function() {
    return window.cancelAnimationFrame          ||
    window.webkitCancelRequestAnimationFrame    ||
    window.mozCancelRequestAnimationFrame       ||
    window.oCancelRequestAnimationFrame     ||
    window.msCancelRequestAnimationFrame        ||

    function( callback ){
      window.clearTimeout(timeID);
    };
  } )();

  window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    function( callback ){
      timeID = window.setTimeout(callback, 1000 / 60);
    };
  })();

  var
  request         = null,
  geojsonLayer    = new L.GeoJSON(null),
  clickLayer      = new L.GeoJSON(null),
  popup           = null,
  timer           = null,
  layer           = null,
  map             = null,
  lastUpdate      = null,
  userName        = 'wsjgraphics',
  tableName       = 'cty0921md',
  refreshInterval = 3000;

  var // polygon styles
  polygonStyle      = { color: "#ff7800", weight: 5, opacity: 0.65, clickable:false },
  clickPolygonStyle = { color: "red", weight: 5, opacity: 0.65, clickable:false };

  function showMessage(message) {

    $(".message").html(message);

    $(".message").animate({ opacity: 1, top: 0 }, { duration: 250, complete: function() {

      setTimeout(function() {
        $(".message").animate({ opacity: 0, top: "-40px" }, 250);
      }, 3000);

    }});
  }

  function addClickPolygon(data) {

    if (!c) return;

    map.removeLayer(clickLayer);

    var polygon = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [c[data.cartodb_id]]
      }
    };

    clickLayer = new L.GeoJSON(polygon, { style: clickPolygonStyle });
    map.addLayer(clickLayer);

    clickLayer.cartodb_id = data.cartodb_id;

  }

  function highlightPolygon(data) {

    if (!c) return;

    // Show the hover polygon if it is a different feature
    map.removeLayer(geojsonLayer);

    var polygon = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [c[data.cartodb_id]]
      }
    };

    geojsonLayer = new L.GeoJSON(polygon, { style: polygonStyle });
    map.addLayer(geojsonLayer);

    geojsonLayer.cartodb_id = data.cartodb_id;


  }

  function createLayer(updatedAt, opacity) {

    var incoming_race = 'gov';

    return new L.CartoDBLayer({
      map: map,
      user_name: userName,
      table_name: tableName,
      tile_style: tileStyleData,
      opacity: opacity,
      query: "SELECT st_name, st_usps, cty0921md.the_geom_webmercator, cty0921md.cartodb_id, states_results." + incoming_race + "_result as status, cty0921md.fips as thecode, cty0921md.st_usps as usps FROM cty0921md, states_results WHERE states_results.usps = cty0921md.st_usps",
      extra_params: {
        cache_buster: updatedAt
      },
      cdn_url: "http://d2c5ry9dy1ewvi.cloudfront.net",
      interactivity: "cartodb_id, status, st_usps",
      featureOver:  function(e, latlng, pos, data) {
        document.body.style.cursor = "pointer";

        highlightPolygon(data);

      },

      featureOut:   function() {

        if (!c) return;
        document.body.style.cursor = "default";
        geojsonLayer.cartodb_id = null;
        geojsonLayer.off("featureparse");
        map.removeLayer(geojsonLayer)

      },

      featureClick: function(e, latlng, pos, data) {

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

  var refresh = function() {

    var userName        = 'viz2';
    var tableName       = 'states_results';
    var url = "http://" + userName + ".cartodb.com/api/v2/sql?q=" + escape("SELECT updated_at FROM " + tableName + " ORDER BY updated_at DESC LIMIT 1");

    $.ajax({url: url, jsonpCallback: "callback", dataType: "jsonp", success: function(data) {

      if (!data.rows) {
        data = JSON.parse(data);
      }

      var updatedAt     = data.rows[0].updated_at;
      var updatedAtDate = moment(updatedAt);

      //console.log(updatedAtDate, lastUpdate);

      if (window.refresh == true || (updatedAtDate > lastUpdate)) { // Update the map

        if (!layer) { // create layer

          layer = createLayer(updatedAt, 1);

          map.addLayer(layer, false);

          $(".last-update").stopwatch('start');

        } else { // update layer

          showMessage("New data coming…");

          window.refresh = false;

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
      timer = setInterval(refresh, refreshInterval);
    }

  }

  function getCounties() {

    $.ajax({ url: "http://com.cartodb.uselections.s3.amazonaws.com/hover_geoms/cty0921md_01.js", jsonpCallback: "callback", dataType: "jsonp", success: function(data) {
      c = data;
    }});

  }

  function initialize() {

    $('.last-update').stopwatch({format: 'Last update: <strong>{Minutes} and {seconds} ago</strong>'});

    popup = new L.CartoDBPopup();

    getCounties();

    var northEast = new L.LatLng(49, 9);
    var southWest = new L.LatLng(6.5, -68);

    var bounds = new L.LatLngBounds(southWest, northEast);

    var options = { center: new L.LatLng(30.849034, -28.371094), zoom: 3, maxZoom: 9, minZoom: 4, zoomAnimation: true, fadeAnimation: true };

    map = new L.Map('map', options);

    map.on("popupclose", function() {
      map.removeLayer(clickLayer);
    });

    $(".interval").val(refreshInterval);

    $(".update-interval").on("click", function() {

      if (refreshInterval != $(".interval").val()) {
        refreshInterval = $(".interval").val();
        showMessage("Refresh interval changed to <strong>" + $(".interval").val() + " milliseconds</strong>");

        clearInterval(timer);
        timer = null;
        refresh();
      }

    });

    refresh();

  }
