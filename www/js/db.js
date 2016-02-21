var db = null;

function connect(){
    db = window.openDatabase("madDiscovery", 1.0, "madDiscovery", 2000000);
    if (db){
        console.log("DATABASE CONNECTED!");
    }
}