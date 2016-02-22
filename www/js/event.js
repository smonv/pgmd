function insertEvent(db, event, callback) {
    db.transaction(function (tx) {
            tx.executeSql("INSERT INTO events(name, location, date, startTime, organizer) VALUES(?,?,?,?,?)",
                [event.name, event.location, event.date, event.startTime, event.organizer],
                onSuccess(event, callback),
                onError
            );
        },
        onError,
        onCompletedTransaction
    );
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
                        location: row['location'],
                        date: row['date'],
                        startTime: row['startTime'],
                        organizer: row['organizer']
                    };
                    events.push(row);
                }
                callback(events);
            }, onError);
        },
        onError,
        onCompletedTransaction
    );
}

function onError(err) {
    console.log("ERROR: " + err.message);
}

function onSuccess(context, callback) {
    console.log(context.length);
    callback(context);
}

function onCompletedTransaction() {
    console.log("TRANSACTION COMPLETED!");
}