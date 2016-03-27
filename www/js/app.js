var app;
var mainView;
var data;

function initApp() {
    app = new Framework7({
        material: true,
        cache: false,
        modalTitle: 'madDiscovery',
        precompileTemplates: true,
        fastClicks: false,
        onAjaxStart: function () {
            app.showIndicator();
        },
        onAjaxComplete: function () {
            app.hideIndicator();
        }
    });

    mainView = app.addView('.view-main', {});
    var conn = null;
    initDb(function (connection) {
        conn = connection;
        if (!conn) {
            alert("CANNOT CONNECT DATABASE");
        }
    });

    data = {
        events: [],
        action: null,
        event: null,
        map: null
    };

    listEvent(conn, function (events) {
        data.events = data.events.concat(events);
        loadEventList(data, onError);
    });

    app.onPageInit('index', function () {
        $('a#event-add').click(function (e) {
            e.preventDefault();
            data.action = 'Add';
            loadEventForm(data, onError);
        });

        $('div.card-header a').on('click', function (e) {
            e.preventDefault();
            var id = $(this).attr('id');
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

    app.onPageInit('map', function () {
        

        var options = {
            center: null,
            zoom: 16,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDoubleClickZoom: true
        };

        options.center = {
            lat: data.event.lat,
            lng: data.event.lng
        };

        initMap(options, function (mapdata) {
            data.map = mapdata;
        });


        $('#map-done').on('click', function (e) {
            e.preventDefault();
            mainView.router.back();
            if (data.map) {
                $('#event-location').val(data.map.formatted_address);
                $('#event-lat').val(data.map.geometry.location.lat());
                $('#event-lng').val(data.map.geometry.location.lng());
            }
        });
    });


    app.onPageInit('event-form', function () {
        $('div.list-block').removeClass('inputs-list');
        app.calendar({
            input: '#event-date'
        });

        $('a#load-map').on('click', function (e) {
            e.preventDefault();
            navigator.geolocation.getCurrentPosition(function (pos) {
                data.event = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };

                if (data.event) {
                    loadMap(data, onError);
                }

            }, function (err) {
                sendAlert('Please enable Location to use map.', null);
                console.log(err);
            }, {maximumAge: 0, timeout: 10000, enableHighAccuracy: true});
        });

        $('#save-event').on('click', function () {
            var event = app.formToJSON('#event-form');
            validateEvent(event, function (err) {
                if (err.length > 0) {
                    err.forEach(function (value) {
                        sendNotify(value);
                    });
                }
                else {
                    if (event.id == "") {
                        addNewEvent(conn, data, event);
                    } else {
                        updateOldEvent(conn, data, event);
                    }
                }
            });

        });
    });
}

function addNewEvent(conn, data, event) {
    insertEvent(conn, event, function (eid) {
        getEvent(conn, eid, function (e) {
            data.events.push(e);

            reloadEventList(data, function (error) {
                if (!error) {
                    sendNotify("New event created");
                } else {
                    console.log("addNewEvent" + error);
                }
            });
        });
    });
}

function updateOldEvent(conn, data, event) {
    updateEvent(conn, event, function (r) {
        data.events.forEach(function (v, k) {
            if (v.id == r.id) {
                data.events[k] = r;
            }
        });

        reloadEventList(data, function (error) {
            if (!error) {
                sendNotify("Event Updated");
                data.event = null;
            } else {
                console.log("updateOldEvent" + error);
            }
        });
    });
}

function sendAlert(message, callback) {
    navigator.notification.alert(message, callback, 'Alert', 'Dismiss');
}

function sendNotify(message) {
    app.addNotification({
        hold: 3000,
        closeOnClick: true,
        message: message
    });
}

function loadTemplate(template, context, callback) {
    $.get('templates/' + template + '.html')
        .success(function (result) {
            var compiledTemplate = Template7.compile($(result).html());
            var html = compiledTemplate(context);
            callback(html);
        })
        .error(function () {
            callback("");
        });
}

function loadEventList(context, callback) {
    loadTemplate('event/index', context, function (content) {
        if (content == '') {
            callback("Cannot load event list!");
        } else {
            mainView.router.loadContent(content);
            callback(null);
        }
    });
}

function reloadEventList(context, callback) {
    loadTemplate('event/index', context, function (content) {
        if (content == '') {
            callback("Cannot load event list!");
        } else {
            mainView.router.reloadContent(content);
            callback(null);
        }
    });
}

function loadEventForm(context, callback) {
    loadTemplate('event/form', context, function (content) {
        if (content == '') {
            callback("Cannot load event form!");
        } else {
            mainView.router.loadContent(content);
            callback(null);
        }
    });
}

function loadMap(context, callback) {
    loadTemplate('event/map', context, function (content) {
        if (content == '') {
            callback("Cannot load map!");
        } else {
            mainView.router.loadContent(content);
            callback(null);
        }
    });
}