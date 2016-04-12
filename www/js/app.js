var app;
var mainView;
var global = {};
var fs;
var T7 = Template7;
T7.global = {};

Date.prototype.getWeek = function () {
    var onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

function onDeviceReady() {
    console.log("app starting...");
    initApp();

    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (filesystem) {
        fs = filesystem;
    }, onError);
}

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

    initDb(function (connection) {
        if (!connection) {
            console.log("CANNOT CONNECT DATABASE");
        } else {
            T7.global.conn = connection;
            startApp();
        }
    });
}

function startApp() {

    T7.global.types = [
        {text: "Event type", value: ""},
        {text: "Conferences", value: "Conferences"},
        {text: "Seminars", value: "Seminars"},
        {text: "Meetings", value: "Meetings"},
        {text: "Opening Ceremonies", value: "Opening Ceremonies"},
        {text: "Incentive Events", value: "Incentive Events"},
        {text: "Family Events", value: "Family Events"}
    ];

    initEvent();

    app.onPageInit('index', function () {
        $('a#event-add').on('click', function (e) {
            e.preventDefault();
            T7.global.action = 'Add';
            loadEventForm(loadContent);
        });

        $('div.card-header a').on('click', function (e) {
            e.preventDefault();
            var eid = $(this).attr('class');

            getEvent(T7.global.conn, eid, onSuccessGetEvent);
        });

        $('a#event-search').on('click', function (e) {
            e.preventDefault();
            loadSearchPage(loadContent);
        });
    });

    app.onPageInit('event-form', function () {
        $('div.list-block').removeClass('inputs-list');

        app.calendar({input: '#event-date'});

        $('a#load-map').on('click', function (e) {
            e.preventDefault();
            navigator.geolocation.getCurrentPosition(function (pos) {
                T7.global.event = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };

                if (T7.global.event) {
                    loadMap(loadContent);
                }

            }, function (err) {
                sendDialogAlert('Please enable Location to use map.', null);
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
                    if (!event.id) {
                        addNewEvent(event);
                    } else {
                        if (event.id != "") {
                            updateOldEvent(event);
                        }
                    }
                }
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
            lat: T7.global.event.lat,
            lng: T7.global.event.lng
        };

        initMap(options, function (mapdata) {
            T7.global.map = mapdata;
        });


        $('#map-done').on('click', function (e) {
            e.preventDefault();
            backContent();
            if (T7.global.map) {
                $('#event-location').val(T7.global.map.formatted_address);
                $('#event-lat').val(T7.global.map.geometry.location.lat());
                $('#event-lng').val(T7.global.map.geometry.location.lng());
            }
        });
    });

    app.onPageInit('event-detail', function () {
        $('div.list-block').removeClass('inputs-list');
        $('a#more').on('click', function (e) {
            e.preventDefault();
            var target = this;
            var buttons = [
                {
                    text: 'Edit',
                    onClick: function(){
                        loadEventForm(function (content) {
                            if (content != null) {
                                mainView.router.loadContent(content);
                                app.formFromJSON('#event-form', T7.global.event);
                            }
                        });
                    }
                },
                {
                    text: 'Delete'
                },
                {
                    text: 'New Report'
                },
                {
                    text: 'Take photo',
                    onClick: function(){
                        getPhoto(Camera.PictureSourceType.CAMERA, onSuccessGetPhoto);
                    }
                },
                {
                    text: 'Choose photo',
                    onClick: function(){
                        getPhoto(Camera.PictureSourceType.PHOTOLIBRARY, onSuccessGetPhoto);
                    }
                }
            ];
            app.actions(target, buttons);
        });
        $('a#edit').on('click', function (e) {
            e.preventDefault();
            loadEventForm(function (content) {
                if (content != null) {
                    mainView.router.loadContent(content);
                    app.formFromJSON('#event-form', T7.global.event);
                }
            });
        });

        selectImageByEvent(T7.global.conn, T7.global.event.id, onSuccessSelectImage);


        $('a#choose').on('click', function () {
            getPhoto(Camera.PictureSourceType.PHOTOLIBRARY, onSuccessGetPhoto);
        });

        $('a#take').on('click', function () {
            getPhoto(Camera.PictureSourceType.CAMERA, onSuccessGetPhoto);
        });

        $(document).on('click', 'img.event-img', function (e) {
            e.preventDefault();
            var id = $(this).attr('id');
            $.each(T7.global.event.images, function (i, v) {
                if (v.id == id) {
                    T7.global.image = v;
                }
            });

            if (T7.global.image) {
                loadEventImage(loadContent);
            }
        });
    });

    app.onPageInit('image', function () {
        $('a#img-remove').on('click', function (e) {
            e.preventDefault();
            sendDialogConfirm('Remove Image', 'Are you sure to remove this image?', ['Remove', 'Cancle'], onRemoveImage);
        });
    });

    app.onPageInit('event-search', function () {
        app.calendar({input: '#event-date'});

        $('a#search-submit').on('click', function (e) {
            e.preventDefault();
            var query = "SELECT * FROM events WHERE ";
            var searchData = [];
            var formData = app.formToJSON('#search-form');
            var keys = Object.keys(formData);
            var idx = -1;
            check:
                for (var j = 0; j < keys.length; j++) {
                    if (keys[j] == "lng" || keys[j] == "lat") {
                        if (formData[keys[j]] != "") {
                            idx = keys.indexOf("location");
                            break check;
                        }
                    }
                }
            if (idx > -1) {
                keys.splice(idx, 1);
            }

            var first = true;
            for (var i = 0; i < keys.length; i++) {
                if (formData[keys[i]] != "") {
                    if (!first) {
                        query += " AND ";
                    }
                    if (keys[i] == "type" || keys[i] == "date" || keys[i] == "lat" || keys[i] == "lng") {
                        query += keys[i] + " == ?";
                        searchData.push(formData[keys[i]]);
                    } else {
                        query += keys[i] + " LIKE ?";
                        searchData.push("'%" + formData[keys[i]] + "%'");
                    }
                    first = false;
                }
            }

            searchEvent(T7.global.conn, query, searchData, function (events) {
                T7.global.search = events;
                if (T7.global.search) {
                    loadSearchItem(function (content) {
                        $('div.event-list').empty().append(content);
                    });
                }
            });
        });

        $('a#load-map').on('click', function (e) {
            e.preventDefault();
            navigator.geolocation.getCurrentPosition(function (pos) {
                T7.global.event = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };

                if (T7.global.event) {
                    loadMap(loadContent);
                }

            }, function (err) {
                sendDialogAlert('Please enable Location to use map.', null);
                console.log(err);
            }, {maximumAge: 0, timeout: 10000, enableHighAccuracy: true});
        });
    });
}

function initEvent() {
    var m = thisMonthToString();
    selectEventByMonth(T7.global.conn, m, function (events) {
        filterEvent(events);
        loadEventIndex(loadContent);
    });
}

function filterEvent(events) {
    var d = new Date();
    T7.global.events = events;
    T7.global.today = [];
    T7.global.week = [];

    $.each(events, function (i, v) {
        var ed = new Date(v.date);
        if (ed.getDate() == d.getDate()) {
            T7.global.today.push(v);
        }
    });

    $.each(events, function (i, v) {
        var ed = new Date(v.date);
        if (ed.getWeek() == d.getWeek()) {
            T7.global.week.push(v);
        }
    });
}

function onSuccessListEvent(events) {
    console.log(events);
    T7.global.events = events;
    loadEventIndex(loadContent);
}

function onSuccessGetEvent(event) {
    T7.global.event = event;
    loadEventDetail(loadContent);
}

function onSuccessSelectImage(images) {
    T7.global.event.images = images;
    loadEventGallery(function (content) {
        $('div#gallery').empty().append(content);
    });
}

function onSuccessGetPhoto(image) {
    window.resolveLocalFileSystemURL(image, onSuccessResolveLocalFS, onError);
}

function onSuccessResolveLocalFS(entry) {
    copyImage(entry, onSuccessCopyImage, onError);
}

function onSuccessCopyImage(image) {
    insertImage(T7.global.conn, image, onSuccessInsertImage, onError);
}

function onSuccessInsertImage() {
    selectImageByEvent(T7.global.conn, T7.global.event.id, onSuccessSelectImage, onError);
}

function onRemoveImage(buttonIndex) {
    if (buttonIndex == 1) {
        removeImage(T7.global.image.path, onSuccessRemoveImage);
    }
}
function onSuccessRemoveImage(result) {
    if (result == 'success') {
        deleteImage(T7.global.conn, T7.global.image.id, onSuccessDeleteImage);
    }
}
function onSuccessDeleteImage(result) {
    if (result == 'success') {
        backContent();
        selectImageByEvent(T7.global.conn, T7.global.event.id, onSuccessSelectImage);
        sendNotify(T7.global.image.name + ' removed.');
        T7.global.image = null;
    }
}

function copyImage(fileEntry, callback) {
    var d = new Date();
    var n = d.getTime();
    var newFilename = n + '.jpg';
    var image = {
        name: newFilename,
        eid: T7.global.event.id
    };
    fs.root.getDirectory('images', {
        create: true,
        exclusive: false
    }, function (dir) {
        fileEntry.copyTo(dir, newFilename, function (result) {
            image.path = result.nativeURL;
            callback(image)
        }, onError)
    }, onError);
}

function removeImage(path, callback) {
    window.resolveLocalFileSystemURL(path, function (fileEntry) {
        console.log(fileEntry);
        fileEntry.remove(function () {
            callback('success');
        }, onError);
    }, onError);
}

function onSuccessInsertEvent(event) {
    selectEventByMonth(T7.global.conn, thisMonthToString(), function (events) {
        filterEvent(events);
        reloadEventList(reloadContent);
        sendNotify("New event created");
    });
}

function addNewEvent(event) {
    insertEvent(T7.global.conn, event, onSuccessInsertEvent);
}

function onSuccessUpdateEvent(event) {
    T7.global.events.forEach(function (v, k) {
        if (v.id == event.id) {
            T7.global.events[k] = event;
        }
    });

    selectEventByMonth(T7.global.conn, thisMonthToString(), function (events) {
        filterEvent(events);
        reloadEventList(function (content) {
            reloadContent(content);
            sendNotify("Event Updated");
            T7.global.event = null;
        });
    });

}

function updateOldEvent(event) {
    updateEvent(T7.global.conn, event, onSuccessUpdateEvent);
}

function loadTemplate(template, callback) {
    $.get('templates/' + template + '.html')
        .success(function (result) {
            var compiledTemplate = Template7.compile($(result).html());
            var html = compiledTemplate();
            callback(html);
        })
        .error(function (xhr, err) {
            console.log(err);
            callback('');
        });
}

function loadEventIndex(callback) {
    loadTemplate('event/index', function (content) {
        callback(content);
    });
}

function reloadEventList(callback) {
    loadTemplate('event/index', function (content) {
        callback(content);
    });
}

function loadEventForm(callback) {
    loadTemplate('event/form', function (content) {
        callback(content);
    });
}

function loadEventDetail(callback) {
    loadTemplate('event/detail', function (content) {
        callback(content);
    });
}

function loadMap(callback) {
    loadTemplate('event/map', function (content) {
        callback(content)
    });
}

function loadEventGallery(callback) {
    loadTemplate('event/gallery', function (content) {
        callback(content);
    });
}

function loadEventImage(callback) {
    loadTemplate('event/image', function (content) {
        console.log(content);
        callback(content);
    });
}

function loadSearchPage(callback) {
    loadTemplate('event/search', function (content) {
        callback(content);
    });
}

function loadSearchItem(callback) {
    loadTemplate('event/search_item', function (content) {
        callback(content);
    })
}

function getPhoto(source, callback) {
    navigator.camera.getPicture(callback, onError, {
        quality: 100,
        sourceType: source,
        destinationType: Camera.DestinationType.FILE_URI,
        allowEdit: true,
        encodingType: Camera.EncodingType.JPEG
    });
}

function loadContent(content) {
    if (content != '') {
        mainView.router.loadContent(content);
    } else {
        console.log('empty content');
    }
}

function reloadContent(content) {
    if (content != '') {
        mainView.router.reloadContent(content)
    } else {
        console.log('empty content');
    }
}

function backContent() {
    mainView.router.back();
}

function onError(err) {
    if (err) {
        console.log("ERROR: " + err.code + " - " + err.message);
    }
}

function sendDialogAlert(message, callback) {
    navigator.notification.alert(message, callback, 'Alert', 'Dismiss');
}
function sendDialogConfirm(title, message, buttons, callback) {
    navigator.notification.confirm(
        message,
        callback,
        title,
        buttons
    );
}

function sendNotify(message) {
    app.addNotification({
        hold: 3000,
        closeOnClick: true,
        message: message
    });
}

function validateEvent(event, callback) {
    var err = [];
    if (event.type == "") {
        err.push("Event type is required!");
    }
    if (event.name == "") {
        err.push("Event name is required!");
    }
    if (event.date == "") {
        err.push("Event date is required!");
    }
    if (event.organizer == "") {
        err.push("Event organizer is required!");
    }
    callback(err);
}

function thisMonthToString() {
    var d = new Date();
    var m = d.getMonth() + 1;
    if (m < 10) {
        m = '0' + m;
    }
    return m;
}