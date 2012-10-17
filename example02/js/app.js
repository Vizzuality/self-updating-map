// "SELECT st0921md.cartodb_id, st0921md.the_geom_webmercator, st0921md.usps as thecode, 'none' as status, 'none' as thename, st0921md.usps as usps FROM st0921md WHERE st0921md.usps is null"

var // colors
darkerRed            = '#850713';
fullRed              = '#c72535';
fullRed_tint         = '#f4d3d7';
mediumRed            = '#d77464';
mediumRed_tint       = '#f7e3e0';
fullBlue             = '#0073a2';
fullBlue_tint        = '#cce3ec';
mediumBlue           = '#5c94ba';
mediumBlue_tint      = '#deeaf1';
mediumGray           = '#cccccc';
lightGray            = '#f7f7f7';
mediumGray_tint_tint = '#f4edf9';
darkerBlue           = '#035170';
indepClr             = '#FFEEC3';
indBG                = '#F5C95B';

var tileStyleData = "#st0921md{line-width:1;line-opacity:1;}[status='none']{line-color:" + '#cccccc' + ";polygon-fill:" + '#eeeeee' + "}[status='RR']{line-color:" + mediumGray + ";polygon-fill:" + fullRed + "}[status='R']{line-color:" + mediumGray + ";polygon-fill:" + mediumRed + ";polygon-pattern-file:url('http://graphics.wsj.com/documents/images/hatch16mm.png')}[status='D']{line-color:" + mediumGray + ";polygon-fill:" + mediumBlue + ";polygon-pattern-file:url('http://graphics.wsj.com/documents/images/hatch16mm.png')}[status='DD']{line-color:" + mediumGray + ";polygon-fill:" + fullBlue + "}[status='I']{line-color:" + '#999999' + ";polygon-fill:" + indepClr + ";polygon-pattern-file:url('http://graphics.wsj.com/documents/images/hatch16mm.png')}[status='II']{line-color:" + '#999999' + ";polygon-fill:" + indepClr + "}[status='U']{line-color:" + '#666666' + ";polygon-fill:" + mediumGray + ";polygon-pattern-file:url('http://graphics.wsj.com/documents/images/hatch16mm.png')}";

  var polygon = new L.GeoJSON(null);
  var polygonStyle = {color: "#333", weight: 0, opacity:1, fillOpacity: 1, fillColor:"#FFCC00", clickable: false};

  var
  popup           = null,
  timer           = null,
  layer           = null,
  map             = null,
  lastUpdate      = null,
  userName        = 'wsjgraphics',
  tableName       = 'st0921md',
  refreshInterval = 3000;

  function showMessage(message) {

    $(".message").html(message);

    $(".message").animate({ opacity: 1, top: 0 }, { duration: 250, complete: function() {

      setTimeout(function() {
        $(".message").animate({ opacity: 0, top: "-40px" }, 250);
      }, 3000);

    }});
  }

  function onHover(e, latlng, pos, data) {
    document.body.style.cursor = "pointer";

    // Show the hover polygon if it is a different feature
    if (data.cartodb_id != polygon.cartodb_id) {
      map.removeLayer(polygon);

      polygon = new L.GeoJSON(JSON.parse(data.geometry), {
        style: function (feature) {
          return polygonStyle;
        }
      }).addTo(map);

      polygon.cartodb_id = data.cartodb_id;
    }
  }

  function onOut() {
    document.body.style.cursor = "default";

    // Hide and remove in any case the hover polygon
    polygon.cartodb_id = null;
    polygon.off("featureparse");
    map.removeLayer(polygon)
  }

  function onClick(e, latlng, pos, data) {

    if (typeof( window.event ) != "undefined" ) { // IE
      e.cancelBubble=true;
    } else { // Rest
      e.preventDefault();
      e.stopPropagation();
    }

    popup.setContent(data);
    popup.setLatLng(latlng);
    map.openPopup(popup);

  }

  function createLayer(updatedAt) {

    var incoming_race = 'gov';

    return new L.CartoDBLayer({
      map: map,
      tile_style: tileStyleData,

      query: "SELECT cty0921md.the_geom_webmercator, geomjson as geometry, cty0921md.cartodb_id, states_results." + incoming_race + "_result as status, cty0921md.fips as thecode, cty0921md.st_usps as usps FROM cty0921md, states_results WHERE states_results.usps = cty0921md.st_usps",

      opacity: 1,
      interactivity: null,

      extra_params: { update: updatedAt },

      tiler_domain: "{s}.wsjgraphics.cartodb.com",

      featureOver:  onHover,
      featureOut:   onOut,
      featureClick: onClick,

      auto_bound: false
    });

  }

  var refresh = function() {

    var url = "http://com.cartodb.refreshtokens.s3.amazonaws.com/wsjgraphics/lastupdate.jsonp";

    $.ajax({ url: url, jsonpCallback: "callback", dataType: "jsonp", success: function(data) {

      var updatedAt     = data.time;
      var updatedAtDate = new Date(Date.parse(updatedAt));

      if (updatedAtDate > lastUpdate) { // Update the map

        if (!layer) { // create layer
        console.log('creating layer');

          layer = createLayer(updatedAt);

          map.addLayer(layer);

        } else { // update layer
          console.log('update layer');

          popup._close();

          layerNew = createLayer(updatedAt);

          layerNew.on("load", function() {

            showMessage("Map updated");

            $(".leaflet-container").animate({ opacity: 0 }, 200, function() {
              $(this).animate({ opacity: 1 }, 200);
            });

            this.off("load", null, this); // unbind the load event

            // Swapp the layers
            map.removeLayer(layer);

            delete layer;
            layer = layerNew;

          });

          map.addLayer(layerNew);

        }

        lastUpdate = updatedAtDate;

      }

    }});

    if (!timer) {
      timer = setInterval(refresh, refreshInterval);
    }

  }

  function initialize() {

    popup = new L.CartoDBPopup();

    var options = {
      center: new L.LatLng(30.638, -28.213),
      zoom: 4,
      maxZoom: 9,
      minZoom: 4,
      zoomAnimation: false,
      fadeAnimation: false,
      zoomControl:   false
    };

    map = new L.Map('map', options);

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
