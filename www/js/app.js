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
    $$('.page-content #event-list').remove();
    $$.get('templates/event/list.html', function (d) {
        var compiledTemplate = Template7.compile($$(d).html());
        var html = compiledTemplate(context);
        $$('.page-content').append(html);
    });
}

function loadEventForm(context) {
    $$.get('templates/event/form.html', function (d) {
        var compiledTemplate = Template7.compile($$(d).html());
        mainView.router.load({
            template: compiledTemplate,
            context: context
        });
    });
}

$$('a.event').click(function (e) {
    e.preventDefault();
    loadEventForm({action: "Add"});
});

app.onPageInit('event-form', function () {
    $$('div.list-block').removeClass('inputs-list');
    app.calendar({
        input: '#event-date'
    });
    $$('#save-event').on('click', function () {
        var formData = app.formToJSON('#event-form');
        var event = {
            name: formData.eventName,
            location: formData.eventLocation,
            date: formData.eventDate,
            startTime: formData.eventStartTime,
            organizer: formData.eventOrganizer
        };
        insertEvent(db, event, function (d) {
            data.events.push(d);
            mainView.router.back();
            loadEventList(data);
        });
    });
});