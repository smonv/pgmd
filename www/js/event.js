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

function insertEvent(conn, event, callback) {
    conn.transaction(function (tx) {
            tx.executeSql("INSERT INTO events(name, date, time, organizer, location, lat, lng) VALUES(?,?,?,?,?,?,?)",
                [event.name, event.date, event.time, event.organizer, event.location, event.lat, event.lng],
                function(tx, results){
                    callback(results.insertId)
                },
                onError
            );
        },
        onError
    );
}

function getEvent(conn, id, callback) {
    conn.transaction(function (tx) {
            tx.executeSql("SELECT * FROM events WHERE id = ?",
                [id],
                function (tx, results) {
                    callback(results.rows.item(0));
                },
                onError
            );
        }, onError
    );
}

function updateEvent(conn, event, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("UPDATE events SET name = ?, date = ?, time = ?, organizer = ?, location = ?, lat = ?, lng = ? WHERE id = ?",
            [event.name, event.date, event.time, event.organizer, event.location, event.lat, event.lng, event.id],
            callback(event),
            onError
        );
    });
}

function listEvent(conn, callback) {
    conn.transaction(function (tx) {
            tx.executeSql("SELECT * FROM events", [], function (tx, results) {
                var events = [];
                var total = results.rows.length;
                for (var i = 0; i < total; i++) {
                    var row = results.rows.item(i);
                    events.push(row);
                }
                callback(events);
            }, onError);
        },
        onError
    );
}