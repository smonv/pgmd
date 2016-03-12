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

var db = connect();
if (!db) {
    alert("CANNOT CONNECT DATABASE");
}

createTable(db);

var data = {
    events: []
};

listEvent(db, function (events) {
    data.events = data.events.concat(events);
    loadEventList(data);
});

function loadEventList(context) {
    $$('div#event-list').remove();
    $$.get('templates/event/list.html', function (d) {
        var compiledTemplate = Template7.compile($$(d).html());
        var html = compiledTemplate(context);
        $$('.page-content').append(html);

        $$('div.card-header a').on('click', function (e) {
            var id = $$(this).attr('id');
            getEvent(db, id, function (event) {
                loadEventForm({action: 'Edit'}, event);
            });
        });
    });
}

function loadEventForm(context, event) {
    $$.get('templates/event/form.html', function (d) {
        var compiledTemplate = Template7.compile($$(d).html());
        mainView.router.load({
            template: compiledTemplate,
            context: context
        });
        if (event != null) {
            app.formFromJSON('#event-form', event);
        }
    });
}

$$('a.event').click(function (e) {
    e.preventDefault();
    loadEventForm({action: "Add"}, null);
});


app.onPageInit('event-form', function () {
    $$('div.list-block').removeClass('inputs-list');
    app.calendar({
        input: '#event-date'
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
                    insertEvent(db, event, function (d) {
                        data.events.push(d);
                        mainView.router.back();
                        loadEventList(data);
                        sendNotify("New event created");
                    });
                } else {
                    updateEvent(db, event, function (r) {
                        console.log(r);
                        data.events.forEach(function (v, k) {
                            if (v.id == r.id) {
                                data.events[k] = r;
                            }
                        });
                        mainView.router.back();
                        loadEventList(data);
                        sendNotify("Event Updated");
                    })
                }
            }
        });

    });
});