function initDb(callback) {
    var db = connect();
    if (db) {
        //dropTable(db);
        createTable(db);
        callback(db);
    }
}

function connect() {
    return window.openDatabase("madDiscovery", '', "madDiscovery", 2000000);
}

function createTable(db) {
    db.transaction(function (tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS events(" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, date TEXT, time TEXT, organizer TEXT, location TEXT, lat REAL, lng REAL)");
    }, onError);
}

function dropTable(db) {
    db.transaction(function (tx) {
        tx.executeSql("DROP TABLE IF EXISTS events");
    }, onError);
}

function onError(err) {
    console.log("ERROR: " + err.message);
}