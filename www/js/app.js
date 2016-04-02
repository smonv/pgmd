var app;
var mainView;
var global = {};
var fs;

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
            global.conn = connection;
            startApp();
        }
    });
}

function startApp() {

    listEvent(global.conn, onSuccessListEvent);

    app.onPageInit('index', function () {
        $('a#event-add').on('click', function (e) {
            e.preventDefault();
            global.action = 'Add';
            loadEventForm(global, loadContent);
        });

        $('div.card-header a').on('click', function (e) {
            e.preventDefault();
            var id = $(this).attr('id');
            global.action = 'Edit';

            getEvent(global.conn, id, onSuccessGetEvent);
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
                global.event = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };

                if (global.event) {
                    loadMap(global, loadContent);
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
                    if (event.id == "") {
                        addNewEvent(event);
                    } else {
                        updateOldEvent(event);
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
            lat: global.event.lat,
            lng: global.event.lng
        };

        initMap(options, function (mapdata) {
            global.map = mapdata;
        });


        $('#map-done').on('click', function (e) {
            e.preventDefault();
            backContent();
            if (global.map) {
                $('#event-location').val(global.map.formatted_address);
                $('#event-lat').val(global.map.geometry.location.lat());
                $('#event-lng').val(global.map.geometry.location.lng());
            }
        });
    });

    app.onPageInit('event-detail', function () {
        $('div.list-block').removeClass('inputs-list');
        $('a#event-edit').on('click', function (e) {
            e.preventDefault();
            loadEventForm(global, function (content) {
                if (content != null) {
                    mainView.router.loadContent(content);
                    app.formFromJSON('#event-form', global.event);
                }
            });
        });

        selectImageByEvent(global.conn, global.event.id, onSuccessSelectImage);


        $('a#choose').on('click', function () {
            getPhoto(Camera.PictureSourceType.PHOTOLIBRARY, onSuccessGetPhoto);
        });

        $('a#take').on('click', function () {
            getPhoto(Camera.PictureSourceType.CAMERA, onSuccessGetPhoto);
        });

        $(document).on('click', 'img.event-img', function (e) {
            e.preventDefault();
            var id = $(this).attr('id');
            $.each(global.event.images, function (i, v) {
                if (v.id == id) {
                    global.image = v;
                }
            });
            if (global.image) {
                loadEventImage(global.image, loadContent);
            }
        });
    });

    app.onPageInit('image', function () {
        $('a#img-remove').on('click', function (e) {
            e.preventDefault();
            sendDialogConfirm('Remove Image', 'Are you sure to remove this image?', ['Remove', 'Cancle'], onRemoveImage);
        });
    });
}

function onSuccessListEvent(events) {
    global.events = events;
    loadEventIndex(global, loadContent);
}

function onSuccessGetEvent(event) {
    global.event = event;
    loadEventDetail(global, loadContent);
}

function onSuccessSelectImage(images) {
    global.event.images = images;
    loadEventGallery({images: images}, function (content) {
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
    insertImage(global.conn, image, onSuccessInsertImage, onError);
}

function onSuccessInsertImage() {
    selectImageByEvent(global.conn, global.event.id, onSuccessSelectImage, onError);
}

function onRemoveImage(buttonIndex) {
    if (buttonIndex == 1) {
        removeImage(global.image.path, onSuccessRemoveImage);
    }
}
function onSuccessRemoveImage(result) {
    if (result == 'success') {
        deleteImage(global.conn, global.image.id, onSuccessDeleteImage);
    }
}
function onSuccessDeleteImage(result) {
    if (result == 'success') {
        backContent();
        selectImageByEvent(global.conn, global.event.id, onSuccessSelectImage);
        sendNotify(global.image.name + ' removed.');
        global.image = null;
    }
}

function copyImage(fileEntry, callback) {
    var d = new Date();
    var n = d.getTime();
    var newFilename = n + '.jpg';
    var image = {
        name: newFilename,
        eid: global.event.id
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

function onSuccessInsertEvent(event){
    global.events.push(event);
    reloadEventList(global, reloadContent);
    sendNotify("New event created");
}

function addNewEvent(event) {
    insertEvent(global.conn, event, onSuccessInsertEvent);
}

function onSuccessUpdateEvent(event) {
    global.events.forEach(function (v, k) {
        if (v.id == event.id) {
            global.events[k] = event;
        }
    });

    reloadEventList(global, function (content) {
        reloadContent(content);
        sendNotify("Event Updated");
        global.event = null;
    });
}

function updateOldEvent(event) {
    updateEvent(global.conn, event, onSuccessUpdateEvent);
}

function loadTemplate(template, context, callback) {
    $.get('templates/' + template + '.html')
        .success(function (result) {
            var compiledTemplate = Template7.compile($(result).html());
            var html = compiledTemplate(context);
            callback(html);
        })
        .error(function () {
            callback('');
        });
}

function loadEventIndex(context, callback) {
    loadTemplate('event/index', context, function (content) {
        callback(content);
    });
}

function reloadEventList(context, callback) {
    loadTemplate('event/index', context, function (content) {
        callback(content);
    });
}

function loadEventForm(context, callback) {
    loadTemplate('event/form', context, function (content) {
        callback(content);
    });
}

function loadEventDetail(context, callback) {
    loadTemplate('event/detail', context, function (content) {
        callback(content);
    });
}

function loadMap(context, callback) {
    loadTemplate('event/map', context, function (content) {
        callback(content)
    });
}

function loadEventGallery(context, callback) {
    loadTemplate('event/gallery', context, function (content) {
        callback(content);
    });
}

function loadEventImage(context, callback) {
    loadTemplate('event/image', context, function (content) {
        callback(content);
    });
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

function newError(code, message) {
    return {
        code: code,
        message: message
    };
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
        console.log("ERROR: " + err.message);
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