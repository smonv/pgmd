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

var eventData = {
    events: [
        {
            name: 'Test',
            description: 'Lorem Ipsum'
        },
        {
            name: 'Test 2',
            description: 'Lorem Ipsum 2'
        }
    ]
};

loadEventList(eventData);

$$('a.event').click(function (e) {
    e.preventDefault();
    loadEventForm({test: "aaa"});
});

app.onPageInit('event-form', function (page) {
    $$('div.list-block').removeClass('inputs-list');
    $$('#save-event').on('click', function () {
        var formData = app.formToJSON('#event-form');
        var event = new Event();
        event.name = formData.eventName;
        event.organizer = formData.eventOrganizer;
        event.location = formData.eventLocation;
        event.date = formData.eventDate;
        event.startTime = formData.eventStartTime;

        mainView.router.back();
        eventData.events.shift();
        eventData.events.push({
            name: event.name,
            description: "Test add"
        });
        loadEventList(eventData);
    });
});

function loadEventList(context) {
    $$('.page-content #event-list').remove();
    $$.get('templates/event/list.html', function (data) {
        var compiledTemplate = Template7.compile($$(data).html());
        var html = compiledTemplate(context);
        $$('.page-content').append(html);
    });
};

function loadEventForm(context) {
    $$.get('templates/event/form.html', function (data) {
        var compiledTemplate = Template7.compile($$(data).html());
        mainView.router.load({
            template: compiledTemplate,
            context: context
        });
    });
};