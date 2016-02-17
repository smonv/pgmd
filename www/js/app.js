var app = new Framework7({
    material: true,
    cache: false,
    modalTitle: 'madDiscovery',
    onAjaxStart: function (xhr) {
        app.showIndicator();
    },
    onAjaxComplete: function (xhr) {
        app.hideIndicator();
    }
});

var $$ = Dom7;

var mainView = app.addView('.view-main', {});

app.onPageInit('event-form', function (page) {
    $$('div.list-block').removeClass('inputs-list');
});
