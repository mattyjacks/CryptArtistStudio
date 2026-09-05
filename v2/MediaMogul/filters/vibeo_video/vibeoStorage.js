.pragma library
.import QtQuick.LocalStorage as Sql

// vibeoStorage.js - Persistent configuration storage for vibeoVideo
// Stores user preferences and API key persistently across Shotcut sessions

var dbInstance = null;

function getDatabase() {
    if (!dbInstance) {
        try {
            if (typeof Sql !== "undefined" && Sql.LocalStorage) {
                dbInstance = Sql.LocalStorage.openDatabaseSync("vibeoVideoDB", "1.0", "vibeoVideo Plugin Storage", 100000);
            } else if (typeof LocalStorage !== "undefined") {
                dbInstance = LocalStorage.openDatabaseSync("vibeoVideoDB", "1.0", "vibeoVideo Plugin Storage", 100000);
            }
        } catch (e) {
            console.log("vibeoVideo: Could not open LocalStorage database: " + e.message);
        }
    }
    return dbInstance;
}

function initDb() {
    try {
        var db = getDatabase();
        if (db) {
            db.transaction(function(tx) {
                tx.executeSql("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, val TEXT)");
            });
        }
    } catch (e) {
        console.log("vibeoVideo: initDb error: " + e.message);
    }
}

function saveSetting(key, val) {
    try {
        var db = getDatabase();
        if (db) {
            db.transaction(function(tx) {
                tx.executeSql("INSERT OR REPLACE INTO settings (key, val) VALUES (?, ?)", [key, String(val)]);
            });
            return true;
        }
    } catch (e) {
        console.log("vibeoVideo: saveSetting error: " + e.message);
    }
    return false;
}

function loadSetting(key, defaultVal) {
    try {
        var db = getDatabase();
        if (db) {
            var result = defaultVal;
            db.transaction(function(tx) {
                var rs = tx.executeSql("SELECT val FROM settings WHERE key = ?", [key]);
                if (rs.rows.length > 0) {
                    result = rs.rows.item(0).val;
                }
            });
            return result;
        }
    } catch (e) {
        console.log("vibeoVideo: loadSetting error: " + e.message);
    }
    return defaultVal;
}
