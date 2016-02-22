function connect() {
    var db = window.openDatabase("madDiscovery", 1.0, "madDiscovery", 2000000);
    return db;
}

function createTable(db) {
    db.transaction(function (tx) {
            tx.executeSql("CREATE TABLE IF NOT EXISTS events(eID INTEGER PRIMARY KEY, name, location, date, startTime, organizer)",
                onSuccess,
                onError
            );
        },
        onError,
        onCompletedTransaction
    );
}

function onError(err) {
    console.log("ERROR: " + err.message);
}

function onSuccess(tx, results) {
    console.log(results);
}

function onCompletedTransaction() {
    console.log("TRANSACTION COMPLETED!");
}