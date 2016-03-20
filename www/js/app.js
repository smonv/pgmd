var app = new Framework7({
    material: true,
    cache: false,
    modalTitle: 'madDiscovery',
    precompileTemplates: true,
    onAjaxStart: function (xhr) {
        app.showIndicator();
    },
    onAjaxComplete: function (xhr) {
        app.hideIndicator();
    }
});

function sendNotify(message) {
    app.addNotification({
        hold: 3000,
        closeOnClick: true,
        message: message
    });
}

var $$ = Dom7;

var mainView = app.addView('.view-main', {});

var conn = null;
initDb(function (connection) {
    conn = connection;
    if (!conn) {
        alert("CANNOT CONNECT DATABASE");
    }
});

var data = {
    events: [],
    action: null,
    event: null,
    map: null
};

function loadTemplate(template, context, callback) {
    $.get('templates/' + template + '.html')
        .success(function (result) {
            var compiledTemplate = Template7.compile($$(result).html());
            var html = compiledTemplate(context);
            callback(html);
        })
        .error(function () {
            callback("");
        });
}

function loadEventList(context, callback) {
    loadTemplate('event/index', context, function (content) {
        if (content == "") {
            callback("Cannot load event list!");
        } else {
            mainView.router.loadContent(content);
            callback(null);
        }
    });
}

function loadEventForm(context, callback) {
    loadTemplate('event/form', context, function (content) {
        if (content == "") {
            callback("Cannot load event form!");
        } else {
            mainView.router.loadContent(content);
            callback(null);
        }
    });
}

function loadMap(context, callback) {
    loadTemplate('event/map', context, function (content) {
        if (content == "") {
            callback("Cannot load map!");
        } else {
            mainView.router.loadContent(content);
            var cpos = {
                lat: null,
                lng: null
            };

            var options = {
                center: null,
                zoom: 16,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDoubleClickZoom: true
            };

            if (data.event) {

                cpos.lat = data.event.lat;
                cpos.lng = data.event.lng;
                options.center = cpos;

                initMap(options, function (mapdata) {
                    data.map = mapdata;
                });
            } else {
                navigator.geolocation.getCurrentPosition(function (pos) {
                    cpos.lat = pos.coords.latitude;
                    cpos.lng = pos.coords.longitude;

                    options.center = cpos;
                    initMap(options, function (mapdata) {
                        data.map = mapdata;
                    });
                });
            }
        }
    });
}

listEvent(conn, function (events) {
    data.events = data.events.concat(events);
    loadEventList(data, function (error) {
        if (error) {
            alert(error);
        }
    });
});

app.onPageInit('index', function () {
    $$('div.card-header a').on('click', function (e) {
        e.preventDefault();
        var id = $$(this).attr('id');
        data.action = 'Edit';
        getEvent(conn, id, function (event) {
            data.event = event;
            loadEventForm(data, function (error) {
                if (!error) {
                    app.formFromJSON('#event-form', data.event);
                } else {
                    data.event = null;
                    alert(error);
                }
            });
        });
    });
});

$$('a#event-add').click(function (e) {
    e.preventDefault();
    data.action = 'Add';
    loadEventForm(data, function (error) {
        if (error) {
            alert(error);
        }
    });
});

app.onPageInit('map', function () {
    $$('#map-done').on('click', function (e) {
        if (data.map) {
            e.preventDefault();
            mainView.router.back();
            $$('#event-location').val(data.map.formatted_address);
            $$('#event-lat').val(data.map.geometry.location.lat());
            $$('#event-lng').val(data.map.geometry.location.lng());
        }
    });
});


app.onPageInit('event-form', function () {
    $$('div.list-block').removeClass('inputs-list');
    app.calendar({
        input: '#event-date'
    });
    $$('a#load-map').on('click', function (e) {
        e.preventDefault();
        loadMap(data);
    });
    $$('#save-event').on('click', function () {
        var event = app.formToJSON('#event-form');
        validateEvent(event, function (err) {
            if (err.length > 0) {
                err.forEach(function (value) {
                    sendNotify(value);
                });

            }
            else {
                if (event.id == "") {
                    insertEvent(conn, event, function (d) {
                        data.events.push(d);
                        mainView.router.back();
                        loadEventList(data);
                        sendNotify("New event created");
                    });
                } else {
                    updateEvent(conn, event, function (r) {
                        data.events.forEach(function (v, k) {
                            if (v.id == r.id) {
                                data.events[k] = r;
                            }
                        });
                        mainView.router.back(function(){
                            loadEventList(data, function (error) {
                                if (!error) {
                                    sendNotify("Event Updated");
                                    data.event = null;
                                } else {
                                    alert(error);
                                }
                            });
                        });
                    });
                }
            }
        });

    });
});