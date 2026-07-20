/**
 * Skrypty wyszukuje istniejące indexy i przygotowuje
 * komendy do ich tworzenia na środowisku PROD
 */
db.getCollectionNames().forEach(function(collName) {
    if (!collName.startsWith("system.")) {
        var indexes = db.getCollection(collName).getIndexes();

        indexes.forEach(function(idx) {
            if (idx.name !== "_id_") {
                var keys = JSON.stringify(idx.key);
                var options = Object.assign({}, idx);

                delete options.key;
                delete options.v;
                delete options.ns;

                var optionsStr = Object.keys(options).length > 0 ? ", " + JSON.stringify(options) : "";

                // Budujemy komendę zawiniętą w try...catch
                var command = "try { db." + collName + ".createIndex(" + keys + optionsStr + "); " +
                              "print('OK: " + collName + " -> " + idx.name + "'); } " +
                              "catch(e) { print('POMINIĘTO: " + collName + " -> " + idx.name + " (' + e.codeName + ')'); }";

                print(command);
            }
        });
    }
});