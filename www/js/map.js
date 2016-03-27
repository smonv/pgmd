var map;
var marker;

function initMap(options, callback) {
    var map = new google.maps.Map(document.getElementById('map'), options);
    marker = new google.maps.Marker({
        map: map
    });
    marker.setPosition(options.center);
    marker.setVisible(true);

    // Create the search box and link it to the UI element.
    var input = document.getElementById('pac-input');
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    var autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);

    autocomplete.addListener('place_changed', function () {
        marker.setVisible(false);
        var place = autocomplete.getPlace();

        if (place.geometry) {
            if (place.geometry.viewport) {
                map.fitBounds(place.geometry.viewport);
            } else {
                map.setCenter(place.geometry.location);
                map.setZoom(17);
            }
            marker.setPosition(place.geometry.location);
            marker.setTitle(place.name);
            marker.setVisible(true);

            callback(place);
        }
    });

    $('body').on('click', '.pac-container', function (e) {
        console.log('clicked');
        e.stopImmediatePropagation();
    });
}