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
            "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, type TEXT, date TEXT, time TEXT, organizer TEXT, location TEXT, lat REAL, lng REAL, ended INTEGER)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS images(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, path TEXT, eid INTEGER, rid INTEGER)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, eid INTEGER)");
    }, onDbError);
}

function dropTable(conn) {
    conn.transaction(function (tx) {
        tx.executeSql("DROP TABLE IF EXISTS events");
        tx.executeSql("DROP TABLE IF EXISTS images");
        tx.executeSql("DROP TABLE IF EXISTS reports");
    }, onDbError);
}

function insertEvent(conn, event, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("INSERT INTO events(name, type, date, time, organizer, location, lat, lng, ended) VALUES(?,?,?,?,?,?,?,?,?)",
            [event.name, event.type, event.date, event.time, event.organizer, event.location, event.lat, event.lng, event.ended],
            function (tx, results) {
                event.id = results.insertId;
                callback(event);
            }, function (tx, err) {
                console.log(tx);
                console.log(err);
            });
    }, onError);
}

function checkEventDuplicate(conn, event, callback) {
    conn.transaction(function (tx) {
        if (event.lat || event.lng) {
            tx.executeSql("SELECT COUNT(id) AS count FROM events WHERE name = ? AND type = ? AND date = ? AND organizer = ? AND lat = ? AND lng = ?",
                [event.name, event.type, event.date, event.organizer, event.lat, event.lng], function (tx, results) {
                    onDuplicateCheck(tx, results, callback);
                }, onError);
        } else {
            tx.executeSql("SELECT COUNT(id) AS count FROM events WHERE name = ? AND type = ? AND date = ? AND location = ? AND organizer = ?",
                [event.name, event.type, event.date, event.location, event.organizer], function (tx, results) {
                    onDuplicateCheck(tx, results, callback);
                }, onError);
        }
    });
}

function onDuplicateCheck(tx, results, callback) {
    var result = results.rows.item(0);
    if (result.count > 0) {
        callback('duplicate');
    } else {
        callback(null);
    }

}

function getEvent(conn, id, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("SELECT * FROM events WHERE id = ?",
            [id],
            function (tx, results) {
                callback(results.rows.item(0));
            },
            onError);
    }, onDbError);
}

function updateEvent(conn, event, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("UPDATE events SET name = ?, date = ?, time = ?, organizer = ?, location = ?, lat = ?, lng = ?, ended = ? WHERE id = ?",
            [event.name, event.date, event.time, event.organizer, event.location, event.lat, event.lng, event.ended, event.id],
            callback(event),
            onError
        );
    });
}

function selectEvent(conn, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("SELECT * FROM events", [], function (tx, results) {
            var events = [];
            var total = results.rows.length;
            for (var i = 0; i < total; i++) {
                var row = results.rows.item(i);
                events.push(row);
            }
            callback(events);
        }, onDbError);
    }, onDbError);
}

function selectEventByMonth(conn, m, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("SELECT * FROM events WHERE strftime('%m', date) = ?",
            [m],
            function (tx, results) {
                var events = [];
                var total = results.rows.length;
                for (var i = 0; i < total; i++) {
                    var row = results.rows.item(i);
                    events.push(row);
                }
                callback(events);
            }, onDbError);
    }, onError);
}

function searchEvent(conn, searchQuery, searchData, callback) {
    conn.transaction(function (tx) {
        tx.executeSql(searchQuery, searchData, function (tx, results) {
            var events = [];
            var total = results.rows.length;
            for (var i = 0; i < total; i++) {
                var row = results.rows.item(i);
                events.push(row);
            }
            callback(events);
        }, function (tx, err) {
            console.log(err);
        });
    }, onError);
}

function deleteEvent(conn, eid, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("DELETE FROM events WHERE id = ?",
            [eid], function (tx, result) {
                callback('success');
            }, onError);
    });
}

function insertImage(conn, image, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("INSERT INTO images(name, path, eid) VALUES (?,?,?)",
            [image.name, image.path, image.eid], function (tx, results) {
                callback(image);
            }, onDbError);
    }, onDbError);
}

function selectImageByEvent(conn, eid, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("SELECT * FROM images WHERE eid = ?",
            [eid],
            function (tx, results) {
                var images = [];
                var total = results.rows.length;
                for (var i = 0; i < total; i++) {
                    images.push(results.rows.item(i));
                }
                callback(images);
            }, onDbError);
    }, onDbError);
}

function deleteImage(conn, id, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("DELETE FROM images WHERE id = ?", [id], function (tx, results) {
            callback('success');
        }, onDbError);
    });
}

function insertReport(conn, content, eid, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("INSERT INTO reports(content, eid) VALUES(?,?)",
            [content, eid],
            function (tx, result) {
                var report = {
                    id: result.insertId,
                    content: content,
                    eid: eid
                };
                callback(report);
            }, function (tx, err) {
                console.log(err);
            }
        );
    });
}

function selectReportByEvent(conn, eid, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("SELECT * FROM reports WHERE eid = ?",
            [eid],
            function (tx, result) {
                var reports = [];
                var total = result.rows.length;
                for (var i = 0; i < total; i++) {
                    reports.push(result.rows.item(i));
                }
                callback(reports);
            }, function (tx, err) {
                console.log(err);
            });
    });
}

function deleteReport(conn, rid, callback) {
    conn.transaction(function (tx) {
        tx.executeSql("DELETE FROM reports WHERE id = ?",
            [rid], function () {
                callback('success');
            }, function (tx, err) {
                console.log(err);
            });
    });
}

function onDbError(err) {
    console.log("ERROR: " + err.code + " - " + err.message)
}