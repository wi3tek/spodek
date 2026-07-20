/**
 * Skrypt przedchodzi przez całą kolekcję i usuwa niestandardowe indeksy
 */
db.getCollectionNames().forEach(function(collName) {
    // Pomijamy kolekcje systemowe
    if (!collName.startsWith("system.")) {
        var collection = db.getCollection(collName);
        var indexes = collection.getIndexes();

        // Zliczamy, ile indeksów usunęliśmy (dla informacji w konsoli)
        var droppedCount = 0;

        indexes.forEach(function(idx) {
            // Nie możemy i nie chcemy usuwać indeksu _id
            if (idx.name !== "_id_") {
                try {
                    collection.dropIndex(idx.name);
                    droppedCount++;
                } catch(e) {
                    print("Błąd podczas usuwania: " + collName + " -> " + idx.name + " (" + e.message + ")");
                }
            }
        });

        if (droppedCount > 0) {
            print("Wyczyszczono: " + collName + " (usunięto indeksów: " + droppedCount + ")");
        } else {
             print("Pominięto: " + collName + " (brak indeksów do usunięcia)");
        }
    }
});
print("Koniec operacji.");