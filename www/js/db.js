function initDb(callback) {
    var conn = connect();
    if (conn) {
        //dropTable(conn);
        createTable(conn);
        callback(conn);
    }
}

function connect() {
    return window.openDatabase("madDiscovery", '', "madDiscovery", 2000000);
}

function createTable(conn) {
    conn.transaction(function (tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS events(" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, date TEXT, time TEXT, organizer TEXT, location TEXT, lat REAL, lng REAL)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS images(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, path TEXT, eid INTEGER)");
    }, onError);
}

function dropTable(conn) {
    conn.transaction(function (tx) {
        tx.executeSql("DROP TABLE IF EXISTS events");
        tx.executeSql("DROP TABLE IF EXISTS images");
    }, onError);
}