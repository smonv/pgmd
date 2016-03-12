function connect() {
    return window.openDatabase("madDiscovery", '', "madDiscovery", 2000000);
}

function createTable(db) {
    db.transaction(function (tx) {
            tx.executeSql("CREATE TABLE IF NOT EXISTS events(" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, name, location, date, time, organizer)");
        },
        onError
    );
}

function onError(err) {
    console.log("ERROR: " + err.message);
}