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

function insertEvent(db, event, callback) {
    db.transaction(function (tx) {
            tx.executeSql("INSERT INTO events(name, date, time, organizer, location, lat, lng) VALUES(?,?,?,?,?,?,?)",
                [event.name, event.date, event.time, event.organizer, event.location, event.lat, event.lng],
                callback(event),
                onError
            );
        },
        onError
    );
}

function getEvent(db, id, callback) {
    db.transaction(function (tx) {
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

function updateEvent(db, event, callback) {
    db.transaction(function (tx) {
        tx.executeSql("UPDATE events SET name = ?, date = ?, time = ?, organizer = ?, location = ?, lat = ?, lng = ? WHERE id = ?",
            [event.name, event.date, event.time, event.organizer, event.location, event.lat, event.lng, event.id],
            callback(event),
            onError
        );
    });
}

function listEvent(db, callback) {
    db.transaction(function (tx) {
            tx.executeSql("SELECT * FROM events", [], function (tx, results) {
                var events = [];
                var total = results.rows.length;
                for (var i = 0; i < total; i++) {
                    var row = results.rows.item(i);
                    var event = {
                        name: row.name,
                        date: row['date'],
                        time: row['time'],
                        organizer: row['organizer'],
                        location: row['location'],
                        lat: row['lat'],
                        lng: row['lng']
                    };
                    events.push(row);
                }
                callback(events);
            }, onError);
        },
        onError
    );
}

function onError(err) {
    console.log("ERROR: " + err.message);
}