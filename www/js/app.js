var app;
var mainView;
var data;
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
                loadEventDetail(data, onError);
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

    app.onPageInit('event-detail', function () {
        $('div.list-block').removeClass('inputs-list');
        $('a#event-edit').on('click', function (e) {
            e.preventDefault();
            loadEventForm(data, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    app.formFromJSON('#event-form', data.event);
                }
            });
        });

        selectImageByEvent(conn, data.event.id, function (images) {
            data.event.images = images;
            loadEventGallery({images: data.event.images}, function (content) {
                $('div#gallery').empty().append(content);
            });
        }, onError);


        $('a#choose').on('click', function () {
            getPhoto(Camera.PictureSourceType.PHOTOLIBRARY, function (image) {
                window.resolveLocalFileSystemURL(image, function (entry) {
                    copyImage(entry, function (i) {
                        insertImage(conn, i, function () {
                            selectImageByEvent(conn, data.event.id, function (images) {
                                data.event.images = images;
                                loadEventGallery({images: data.event.images}, function (content) {
                                    $('div#gallery').empty().append(content);
                                });
                            }, onError);
                        }, onError);
                    }, onError);
                }, onError);
            });
        });

        $('a#take').on('click', function () {
            getPhoto(Camera.PictureSourceType.CAMERA, function (image) {
                window.resolveLocalFileSystemURL(image, function (entry) {
                    copyImage(entry, function (i) {
                        insertImage(conn, i, function () {
                            selectImageByEvent(conn, data.event.id, function (images) {
                                data.event.images = images;
                                loadEventGallery({images: data.event.images}, function (content) {
                                    $('div#gallery').empty().append(content);
                                });
                            }, onError);
                        }, onError);
                    }, onError);
                }, onError);
            });
        });

        $(document).on('click', 'img.event-img', function (e) {
            e.preventDefault();
            var id = $(this).attr('id');
            $.each(data.event.images, function (i, v) {
                if (v.id == id) {
                    data.image = v;
                }
            });
            if (data.image) {
                loadEventImage(data.image, null, onError);
            }
        });
    });

    app.onPageInit('image', function(){
        $('a#img-remove').on('click', function(e){
            e.preventDefault();
            navigator.notification.confirm(
                'Are you sure to remove this image?',
                function(buttonIndex){
                    if(buttonIndex == 1){
                        console.log(data.image);
                        removeImage(data.image.path, function(result){
                            if(result == 'success'){
                                deleteImage(conn, data.image.id, function(r){
                                    if(r == 'success'){
                                        mainView.router.back();
                                        selectImageByEvent(conn, data.event.id, function (images) {
                                            data.event.images = images;
                                            loadEventGallery({images: data.event.images}, function (content) {
                                                $('div#gallery').empty().append(content);
                                            });
                                        }, onError);
                                        sendNotify(data.image.name + ' removed.');
                                        data.image = null;
                                    }
                                });
                            } 
                        });

                    }
                },
                'Remove image',
                ['Remove', 'Cancle']
            );
        });
    });
}

function copyImage(fileEntry, callback) {
    var d = new Date();
    var n = d.getTime();
    var newFilename = n + ".jpg";
    var image = {
        name: newFilename,
        eid: data.event.id
    };
    fs.root.getDirectory("images", {
        create: true,
        exclusive: false
    }, function (dir) {
        fileEntry.copyTo(dir, newFilename, function (result) {
            image.path = result.nativeURL;
            callback(image)
        }, onError)
    });
}

function removeImage(path, callback){
    window.resolveLocalFileSystemURL(path, function(fileEntry){
        console.log(fileEntry);
        fileEntry.remove(function(){
           callback('success');
        }, onError);
    }, onError);
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

function loadEventDetail(context, callback) {
    loadTemplate('event/detail', context, function (content) {
        if (content == '') {
            callback(newError('template', 'loadEventDetail: content empty'));
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

function loadEventGallery(context, callback) {
    loadTemplate('event/gallery', context, function (content) {
        if (content == '') {
            callback("Cannot load gallery!");
        } else {
            callback(content);
        }
    });
}

function loadEventImage(context, callback) {
    loadTemplate('event/image', context, function (content) {
        if (content == '') {
            callback(content, newError('template', 'loadEventImage: content empty'))
        } else {
            mainView.router.loadContent(content);
            callback(null, null);
        }
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